-- =====================================================================
-- Seed master data + role groups + a default approval rule.
-- Run this AFTER schema.sql and policies.sql.
-- =====================================================================

-- UoM
insert into public.uom_master(code, description) values
  ('EA','Each'),('NOS','Numbers'),('KG','Kilogram'),('LTR','Litre'),('SET','Set'),
  ('MT','Metric Ton'),('BOX','Box'),('PCS','Pieces'),('HR','Hour'),('DAY','Day')
on conflict do nothing;

-- Material groups
insert into public.material_group_master(code, name) values
  ('MG-IT','IT Consumables'),('MG-HW','Hardware'),('MG-SW','Software / Licenses'),
  ('MG-STA','Stationery'),('MG-SRV','Services'),('MG-AMC','AMC / Support')
on conflict do nothing;

-- Plants
insert into public.plant_master(code, name) values
  ('P001','Head Office — Mumbai'),
  ('P002','Pune Plant'),
  ('P003','Bengaluru Office'),
  ('P004','Delhi Office')
on conflict do nothing;

-- Purchasing groups
insert into public.purchasing_group_master(code, name) values
  ('PG01','IT Procurement'),
  ('PG02','Admin Procurement'),
  ('PG03','Engineering Procurement')
on conflict do nothing;

-- Cost centres
insert into public.cost_centre_master(code, name) values
  ('CC1001','IT'),
  ('CC2001','Marketing'),
  ('CC3001','Engineering'),
  ('CC4001','Finance'),
  ('CC5001','Operations')
on conflict do nothing;

-- GL accounts
insert into public.gl_account_master(code, name, expense_type) values
  ('60001','Office Supplies','OPEX'),
  ('60002','Software Subscriptions','OPEX'),
  ('60003','Travel','OPEX'),
  ('80001','Computer Hardware','CAPEX'),
  ('80002','Office Equipment','CAPEX'),
  ('80003','Plant & Machinery','CAPEX')
on conflict do nothing;

-- Sample CAPEX request and asset (for testing CAPEX flow)
insert into public.capex_request_master(cr_id, title, budget_amount) values
  ('CR-2026-001','Server Refresh', 2500000.00),
  ('CR-2026-002','Office Renovation', 1500000.00)
on conflict do nothing;
insert into public.asset_master(asset_no, description, cr_id) values
  ('AST-2026-0001','Dell PowerEdge R750','CR-2026-001'),
  ('AST-2026-0002','Conference Room AV Kit','CR-2026-002')
on conflict do nothing;

-- Role groups (5 standard levels — admin can rename/add)
insert into public.role_groups(name, description) values
  ('Reporting Manager','Level 1 approval — direct manager'),
  ('Department Head','Level 2 approval'),
  ('Finance Controller','Level 3 approval — Finance validation'),
  ('CFO','Level 4 approval'),
  ('CEO','Level 5 approval — apex sign-off')
on conflict (name) do nothing;

-- Default 5 approval rules (₹ thresholds)
do $$
declare
  g1 uuid := (select id from public.role_groups where name='Reporting Manager');
  g2 uuid := (select id from public.role_groups where name='Department Head');
  g3 uuid := (select id from public.role_groups where name='Finance Controller');
  g4 uuid := (select id from public.role_groups where name='CFO');
  g5 uuid := (select id from public.role_groups where name='CEO');
begin
  insert into public.approval_rules(min_amount, max_amount, level_1_group_id) values (0, 50000, g1) on conflict do nothing;
  insert into public.approval_rules(min_amount, max_amount, level_1_group_id, level_2_group_id) values (50000.01, 200000, g1, g2) on conflict do nothing;
  insert into public.approval_rules(min_amount, max_amount, level_1_group_id, level_2_group_id, level_3_group_id) values (200000.01, 1000000, g1, g2, g3) on conflict do nothing;
  insert into public.approval_rules(min_amount, max_amount, level_1_group_id, level_2_group_id, level_3_group_id, level_4_group_id) values (1000000.01, 5000000, g1, g2, g3, g4) on conflict do nothing;
  insert into public.approval_rules(min_amount, max_amount, level_1_group_id, level_2_group_id, level_3_group_id, level_4_group_id, level_5_group_id) values (5000000.01, null, g1, g2, g3, g4, g5) on conflict do nothing;
end $$;
