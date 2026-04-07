USE org_db;

INSERT INTO users (username, employee_code, full_name, email, department, password_hash, is_active)
VALUES
  ('admin01', 'EMP-0001', 'Admin User', 'admin01@example.com', 'IT', '$2b$10$Hl6RVC/ASkbVPPoyd8CQ9eNnfJz3DXGGFW9s4gl825RVYIsteLQqK', 1),
  ('admin02', 'EMP-0005', 'Admin User 2', 'admin02@example.com', 'IT', '$2b$10$Hl6RVC/ASkbVPPoyd8CQ9eNnfJz3DXGGFW9s4gl825RVYIsteLQqK', 1),
  ('staff01', 'EMP-0002', 'Staff User', 'staff01@example.com', 'General Affairs', '$2b$10$Hl6RVC/ASkbVPPoyd8CQ9eNnfJz3DXGGFW9s4gl825RVYIsteLQqK', 1),
  ('user01', 'EMP-0003', 'Borrower User', 'user01@example.com', 'Marketing', '$2b$10$Hl6RVC/ASkbVPPoyd8CQ9eNnfJz3DXGGFW9s4gl825RVYIsteLQqK', 1),
  ('inactive01', 'EMP-0004', 'Inactive User', 'inactive01@example.com', 'HR', '$2b$10$Hl6RVC/ASkbVPPoyd8CQ9eNnfJz3DXGGFW9s4gl825RVYIsteLQqK', 0)
ON DUPLICATE KEY UPDATE
  employee_code = VALUES(employee_code),
  full_name = VALUES(full_name),
  email = VALUES(email),
  department = VALUES(department),
  password_hash = VALUES(password_hash),
  is_active = VALUES(is_active);
