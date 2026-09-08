// Run with: node scripts/test-challan-migration.cjs <path-to-@electric-sql/pglite>
// Uses an in-memory PostgreSQL database, never application credentials.
const { readFileSync } = require('node:fs');
const { strict: assert } = require('node:assert');
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite');
const db = new PGlite();
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const school = id(1), student = id(2), account = id(3), year = id(4), cls = id(5), first = id(6), second = id(7);
let checks = 0;
async function rejects(sql, pattern) {
  await assert.rejects(db.exec(sql), pattern); checks++;
}
async function main() {
  await db.exec(`
    create schema app; create schema auth; create role authenticated;
    create type public.app_role as enum ('administrator','principal','cashier');
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create function app.has_school_role(uuid, public.app_role[]) returns boolean language sql as
      $$ select coalesce(current_setting('test.authorized', true), 'yes') <> 'no' $$;
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := clock_timestamp(); return new; end $$;
    create table schools(id uuid primary key); create table profiles(id uuid primary key);
    create table students(id uuid primary key); create table academic_years(id uuid primary key);
    create table classes(id uuid primary key);
  `);
  const finance = readFileSync('supabase/migrations/202607130001_finance_module.sql', 'utf8');
  await db.exec(finance.slice(0, finance.indexOf('-- Enable RLS')));
  const monthly = readFileSync('supabase/migrations/202608170003_payroll_fee_monthly_generation.sql', 'utf8');
  await db.exec(monthly.slice(monthly.indexOf('create table'), monthly.indexOf('create index')));
  await db.exec(`
    insert into schools values('${school}'); insert into students values('${student}');
    insert into academic_years values('${year}'); insert into classes values('${cls}');
    insert into student_fee_accounts(id, school_id, student_id, academic_year_id, class_id, total_payable)
      values('${account}','${school}','${student}','${year}','${cls}',1000);
    insert into fee_challans(id,school_id,student_id,student_fee_account_id,class_id,fee_month,amount,due_date)
      values('${first}','${school}','${student}','${account}','${cls}','2026-08-01',1000,'2026-08-31');
    insert into fee_payments(school_id,student_fee_account_id,receipt_number,amount,payment_method)
      values('${school}','${account}','LEGACY',100,'cash');
    create trigger fee_challans_updated_at before update on fee_challans for each row execute function set_updated_at();
  `);
  await db.exec(readFileSync('supabase/migrations/202609080001_challan_centric_fees.sql','utf8'));
  const legacy = (await db.query("select * from fee_payments where receipt_number='LEGACY'")).rows[0];
  assert.equal(legacy.challan_id, null); checks++;
  const snapshot = (await db.query(`select * from fee_challans where id='${first}'`)).rows[0];
  assert.equal(snapshot.line_items[0].amount, 1000); assert.equal(snapshot.academic_year_id, year); checks++;
  await db.exec(`insert into fee_structures(id,school_id,academic_year_id,class_id,tuition_fee,transport_fee)
    values('${id(10)}','${school}','${year}','${cls}',1000,200);
    update student_fee_accounts set fee_structure_id='${id(10)}' where id='${account}';`);
  await db.exec(`insert into fee_challans(id,school_id,student_id,student_fee_account_id,class_id,fee_month,amount,due_date)
    values('${second}','${school}','${student}','${account}','${cls}','2026-09-01',1000,'2020-01-01');`);
  const issued = (await db.query(`select * from fee_challans where id='${second}'`)).rows[0];
  assert.equal(Number(issued.discount_amount),200);
  assert.equal(issued.line_items.find(i => i.description === 'Transport Fee').amount,200); checks++;
  await db.exec(`update fee_structures set tuition_fee=2000 where id='${id(10)}'`);
  assert.equal((await db.query(`select line_items from fee_challans where id='${second}'`)).rows[0].line_items.find(i => i.description === 'Tuition Fee').amount,1000); checks++;
  const insert = (receipt, amount, challan = first, schoolId = school) => `insert into fee_payments(school_id,student_fee_account_id,challan_id,receipt_number,amount,payment_method)
    values('${schoolId}','${account}',${challan ? `'${challan}'` : 'null'},'${receipt}',${amount},'cash')`;
  await db.exec(insert('PARTIAL',400)); checks++;
  await rejects(insert('OVER',601), /exceeds challan balance/);
  await rejects(insert('UNSCOPED',1,null), /Select a challan/);
  await rejects(insert('NON-FINITE',"'NaN'"), /Invalid payment amount/);
  await rejects(insert('WRONG-SCHOOL',1,first,id(99)), /does not belong/);
  await db.exec(insert('OTHER-CHALLAN',1000,second)); checks++;
  const adjust = async (discount, items = null, date = null, expected = null) => {
    const row = (await db.query(`select updated_at::text as stamp from fee_challans where id='${first}'`)).rows[0];
    return `select adjust_fee_challan('${first}','${school}','${expected || row.stamp}',${discount},'Test',${items ? `'${JSON.stringify(items)}'::jsonb` : 'null'},${date ? `'${date}'` : 'null'})`;
  };
  await rejects(await adjust(601), /less than payments/);
  await rejects(await adjust(1001), /Discount exceeds/);
  await rejects(await adjust(0,[]), /Line items required/);
  await rejects(await adjust(0,null,'2020-01-01'), /Due date precedes/);
  await rejects(await adjust(0,null,null,'2020-01-01'), /Challan changed/);
  await db.exec(await adjust(100)); checks++;
  const other = (await db.query(`select amount from fee_challans where id='${second}'`)).rows[0];
  assert.equal(Number(other.amount),1000); checks++;
  await db.exec(`select assign_legacy_challan_payment('${school}','${first}','${legacy.id}')`); checks++;
  await rejects(`select assign_legacy_challan_payment('${school}','${second}','${legacy.id}')`, /cannot be assigned/);
  await db.exec(`update fee_payments set is_voided=true where receipt_number='PARTIAL'`);
  await db.exec(await adjust(800)); checks++;
  await rejects(`update fee_payments set is_voided=false where receipt_number='PARTIAL'`, /exceeds challan balance/);
  await rejects(`update fee_payments set challan_id='${second}' where receipt_number='LEGACY'`, /immutable/);
  await db.exec("set test.authorized='no'");
  await rejects(await adjust(0), /Unauthorized/);
  console.log(`Challan migration: ${checks} PostgreSQL checks passed`);
}
main().finally(() => db.close()).catch(error => { console.error(error); process.exitCode=1; });
