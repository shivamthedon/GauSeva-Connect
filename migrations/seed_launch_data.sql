-- Launch seed data for GauSeva Connect (demo / soft-launch content)
-- Safe to re-run: uses fixed IDs with INSERT OR REPLACE
-- Note: demo listings intentionally omitted (marketplace starts empty)

INSERT OR REPLACE INTO vets (id, data) VALUES
('seed_vet_01', '{"id":"seed_vet_01","userId":"seed_owner_02","name":"Dr. Anil Sharma","specialization":"Large animal / cattle","location":"Hisar, Haryana","verified":true,"contactNumber":"9810011223","experience":"12 years"}'),
('seed_vet_02', '{"id":"seed_vet_02","userId":"seed_owner_01","name":"Dr. Priya Mehta","specialization":"Emergency trauma & rescue","location":"Ahmedabad, Gujarat","verified":true,"contactNumber":"9825099887","experience":"8 years"}');

INSERT OR REPLACE INTO transports (id, data) VALUES
('seed_trn_01', '{"id":"seed_trn_01","userId":"seed_owner_06","name":"Seva Cattle Transport","vehicleType":"Covered livestock carrier","location":"North India (Delhi–Rajasthan–Haryana)","verified":true,"contactNumber":"9999911122"}'),
('seed_trn_02', '{"id":"seed_trn_02","userId":"seed_owner_05","name":"Humane Haul South","vehicleType":"Mini truck with padding","location":"Karnataka–Andhra","verified":false,"contactNumber":"9886612345"}');

INSERT OR REPLACE INTO users (id, data) VALUES
('seed_owner_01', '{"id":"seed_owner_01","name":"Shree Gir Seva Trust","email":"gir.seva@example.com","phone":"+919876543210","city":"Junagadh","state":"Gujarat","fullAddress":"Near Gir Road","pincode":"362001","onboarded":true,"createdAt":"2026-06-01T00:00:00.000Z"}'),
('seed_owner_02', '{"id":"seed_owner_02","name":"Ramesh Kumar","email":"ramesh.k@example.com","phone":"+919811122233","city":"Hisar","state":"Haryana","fullAddress":"Model Town","pincode":"125001","onboarded":true,"createdAt":"2026-06-05T00:00:00.000Z"}'),
('seed_owner_03', '{"id":"seed_owner_03","name":"Jaipur Animal Care","email":"jac@example.com","phone":"+919922001122","city":"Jaipur","state":"Rajasthan","fullAddress":"Malviya Nagar","pincode":"302017","onboarded":true,"createdAt":"2026-06-10T00:00:00.000Z"}');
