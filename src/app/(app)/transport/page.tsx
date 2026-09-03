import type { ReactNode } from "react";
import { Bus, ChevronDown, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import { PakistaniPhoneInput } from "@/components/ui/pakistani-phone-input";
import { TransportActionPopover } from "@/components/transport/action-popover";
import { TransportRefreshForm } from "@/components/transport/transport-refresh-form";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getTransportDashboard } from "@/lib/services/transport";
import { formatFullName } from "@/lib/student-name";
import {
  assignTransportAction,
  createDriverAction,
  createRouteAction,
  createVehicleAction,
  removeTransportAction,
  updateVehicleAction
} from "@/app/(app)/transport/actions";

export default async function TransportPage() {
  const user = await requireUser("transport:view");
  const canManage = hasPermission(user.role, "transport:manage", user.permissions);
  const data = await getTransportDashboard(user);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Transport Dashboard"
        description="Manage routes, drivers, buses, capacity, and student transport billing."
        actions={
          canManage ? (
            <div className="flex flex-wrap justify-end gap-2">
              <TransportActionPopover title="Add Driver" triggerLabel="Add Driver" icon="driver">
                <DriverForm />
              </TransportActionPopover>
              <TransportActionPopover title="Add Vehicle" triggerLabel="Add Vehicle" icon="vehicle">
                <VehicleForm data={data} />
              </TransportActionPopover>
            </div>
          ) : null
        }
      />

      {data.migrationRequired ? (
        <Card className="rounded-[28px] border border-outline/70 bg-white shadow-card">
          <CardContent className="pt-6">
            <EmptyState
              title="Database migration required"
              description="Apply the latest School OS migration to enable transport routes, vehicles, and passenger assignment."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.vehicles.length ? (
            data.vehicles.map((vehicle: any) => {
              const capacity = Number(vehicle.seat_capacity || 0);
              const passengers = Number(vehicle.passenger_count || 0);
              const pct = capacity ? Math.min(100, Math.round((passengers / capacity) * 100)) : 0;
              const roster = data.assignments.filter((item) => item.vehicle_id === vehicle.id);
              return (
                <details key={vehicle.id} className="group overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-card">
                  <summary className="grid cursor-pointer gap-4 px-5 py-5 transition hover:bg-surface-low/60 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[1.35rem] font-semibold text-ink">{vehicle.plate_number}</h3>
                        <Badge tone={vehicle.status === "active" ? "green" : "yellow"}>{vehicle.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">{vehicle.route_name ?? "No route mapped"} / {vehicle.driver_name ?? "No driver"} / {passengers} passengers</p>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-sm font-semibold text-muted">{capacity ? `${passengers}/${capacity} seats` : "Capacity not set"}</span>
                      <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" aria-hidden="true" />
                    </div>
                  </summary>
                  <div className="grid gap-5 border-t border-outline/60 p-5">
                    <div className="grid gap-3 md:grid-cols-4">
                      <TransportInfo icon={<Bus className="h-4 w-4" />} label="Vehicle" value={vehicle.plate_number} />
                      <TransportInfo icon={<Users className="h-4 w-4" />} label="Driver" value={vehicle.driver_name ?? "Unassigned"} hint={vehicle.driver_phone ?? undefined} />
                      <TransportInfo icon={<MapPin className="h-4 w-4" />} label="Route" value={`${vehicle.start_point ?? "-"} to ${vehicle.end_point ?? "-"}`} />
                      <TransportInfo icon={<Users className="h-4 w-4" />} label="Fare" value={`${Number(vehicle.monthly_fare || 0).toLocaleString()} / month`} />
                    </div>

                    {canManage ? (
                      <div className="flex flex-col gap-3 rounded-lg bg-surface-low p-3 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1">
                          <VehicleSettingsForm data={data} vehicle={vehicle} />
                        </div>
                        <div className="shrink-0">
                          <TransportActionPopover title="Add Route" triggerLabel="Add Route" icon="route" variant="secondary">
                            <RouteForm vehicleId={vehicle.id} submitLabel="Save Route for This Vehicle" />
                          </TransportActionPopover>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-1 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold text-ink">{passengers} / {capacity} seats</span>
                        <span className="text-muted">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-low">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="rounded-[22px] bg-surface-low/50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">Students and Staff Using This Transport</p>
                        {canManage ? (
                          <TransportActionPopover title="Add Student" triggerLabel="Add Student" icon="student" variant="secondary">
                            <AssignStudentForm data={data} vehicle={vehicle} />
                          </TransportActionPopover>
                        ) : null}
                      </div>
                      {roster.length ? (
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {roster.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-outline/40">
                              <span className="min-w-0 truncate">{item.student_name} <span className="text-muted">({item.admission_number})</span></span>
                              {canManage ? (
                                <TransportRefreshForm action={removeTransportAction} confirmText={`Remove ${item.student_name} from this transport?`}>
                                  <input type="hidden" name="assignment_id" value={item.id} />
                                  <Button type="submit" variant="ghost" size="sm">Remove</Button>
                                </TransportRefreshForm>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted">No students or staff assigned.</p>
                      )}
                    </div>
                  </div>
                </details>
              );
            })
          ) : (
            <div>
              <EmptyState title="No vehicles yet" description="Add a driver and vehicle to begin assigning students." />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function DriverForm() {
  return (
    <TransportRefreshForm action={createDriverAction} className="grid gap-3">
      <Field label="Full name"><Input name="full_name" required /></Field>
      <Field label="Phone"><PakistaniPhoneInput name="phone" required /></Field>
      <Field label="License number"><Input name="license_number" required /></Field>
      <Button type="submit">Save Driver</Button>
    </TransportRefreshForm>
  );
}

function VehicleForm({ data }: { data: any }) {
  return (
    <div className="grid max-h-[75vh] gap-4 overflow-y-auto">
      <TransportRefreshForm action={createVehicleAction} className="grid gap-3">
        <Field label="Plate number"><Input name="plate_number" required /></Field>
        <Field label="Seat capacity"><Input name="seat_capacity" type="number" min="1" required /></Field>
        <Field label="Driver">
          <Select name="driver_id">
            <option value="">Unassigned</option>
            {data.drivers.map((driver: any) => <option key={driver.id} value={driver.id}>{driver.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Route">
          <Select name="route_id">
            <option value="">Unassigned</option>
            {data.routes.map((route: any) => <option key={route.id} value={route.id}>{route.name}</option>)}
          </Select>
        </Field>
        <Button type="submit">Save Vehicle</Button>
      </TransportRefreshForm>
      <details className="rounded-xl bg-surface-low p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
          <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Add Route</span>
          <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
        </summary>
        <div className="mt-3">
          <RouteForm submitLabel="Save Route" />
        </div>
      </details>
    </div>
  );
}

function VehicleSettingsForm({ data, vehicle }: { data: any; vehicle: any }) {
  return (
    <TransportRefreshForm action={updateVehicleAction} className="grid gap-3 rounded-lg bg-white p-3 ring-1 ring-outline/50 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
      <input type="hidden" name="vehicle_id" value={vehicle.id} />
      <Field label="Driver">
        <Select name="driver_id" defaultValue={vehicle.driver_id ?? ""}>
          <option value="">Unassigned</option>
          {data.drivers.map((driver: any) => <option key={driver.id} value={driver.id}>{driver.full_name}</option>)}
        </Select>
      </Field>
      <Field label="Route">
        <Select name="route_id" defaultValue={vehicle.route_id ?? ""}>
          <option value="">Unassigned</option>
          {data.routes.map((route: any) => <option key={route.id} value={route.id}>{route.name}</option>)}
        </Select>
      </Field>
      <Button type="submit" size="sm">Save</Button>
    </TransportRefreshForm>
  );
}

function AssignStudentForm({ data, vehicle }: { data: any; vehicle: any }) {
  return (
    <TransportRefreshForm action={assignTransportAction} className="grid gap-3">
      <input type="hidden" name="vehicle_id" value={vehicle.id} />
      <Field label="Student">
        <Select name="student_id" required>
          <option value="">Choose student</option>
          {data.students.map((student: any) => (
            <option key={student.id} value={student.id}>
              {formatFullName(student.first_name, student.last_name)} / {student.admission_number}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit">Add Student</Button>
    </TransportRefreshForm>
  );
}

function RouteForm({ vehicleId, submitLabel }: { vehicleId?: string; submitLabel: string }) {
  return (
    <TransportRefreshForm action={createRouteAction} className="grid gap-3">
      {vehicleId ? <input type="hidden" name="vehicle_id" value={vehicleId} /> : null}
      <Field label="Route name"><Input name="name" required /></Field>
      <Field label="Start point"><Input name="start_point" required /></Field>
      <Field label="End point"><Input name="end_point" required /></Field>
      <Field label="Monthly fare"><Input name="monthly_fare" type="number" min="0" step="0.01" required /></Field>
      <Button type="submit">{submitLabel}</Button>
    </TransportRefreshForm>
  );
}

function TransportInfo({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-outline/40 bg-surface-low p-3 text-sm">
      <div className="mb-1 flex items-center gap-1.5 text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="truncate font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 truncate text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
