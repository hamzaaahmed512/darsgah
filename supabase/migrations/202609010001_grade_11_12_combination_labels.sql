update public.students
set major = case lower(btrim(major))
  when 'biology' then 'biology'
  when 'pre-medical' then 'biology'
  when 'computer' then 'computer'
  when 'ics with physics' then 'computer'
  when 'pre engineering' then 'pre_engineering'
  when 'pre-engineering' then 'pre_engineering'
  when 'computer with economics' then 'computer_economics'
  when 'ics with economics' then 'computer_economics'
  when 'computer with economics and stats' then 'computer_economics_stats'
  when 'ics with economics and stats' then 'computer_economics_stats'
  else major
end
where major is not null;

update public.student_subject_combinations
set name = case combination_key
  when 'biology' then 'Pre-Medical'
  when 'computer' then 'ICS with Physics'
  when 'pre_engineering' then 'Pre-Engineering'
  when 'computer_economics' then 'ICS with Economics'
  when 'computer_economics_stats' then 'ICS with Economics and Stats'
  else name
end
where combination_key is not null;
