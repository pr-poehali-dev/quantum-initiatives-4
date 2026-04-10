ALTER TABLE t_p94698650_quantum_initiatives_.orders
  ALTER COLUMN amount SET DEFAULT 0;

ALTER TABLE t_p94698650_quantum_initiatives_.orders
  ADD COLUMN IF NOT EXISTS car_info VARCHAR(500),
  ADD COLUMN IF NOT EXISTS comment TEXT,
  ADD COLUMN IF NOT EXISTS firmware_file_id INTEGER REFERENCES t_p94698650_quantum_initiatives_.firmware_files(id);
