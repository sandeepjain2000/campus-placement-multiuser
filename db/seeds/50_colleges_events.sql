-- Auto-generated seed file for 50 colleges and 20 placement drives

-- 1. Insert 50 Colleges
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000000', 'Institute of Technology, Mumbai', 'iot-mumbai', 'college', 'Mumbai', 'State', 'placement@iotmumbai.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000001', 'Institute of Technology, Delhi', 'iot-delhi', 'college', 'Delhi', 'State', 'placement@iotdelhi.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000002', 'Institute of Technology, Bangalore', 'iot-bangalore', 'college', 'Bangalore', 'State', 'placement@iotbangalore.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000003', 'Institute of Technology, Hyderabad', 'iot-hyderabad', 'college', 'Hyderabad', 'State', 'placement@iothyderabad.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000004', 'Institute of Technology, Ahmedabad', 'iot-ahmedabad', 'college', 'Ahmedabad', 'State', 'placement@iotahmedabad.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000005', 'Institute of Technology, Chennai', 'iot-chennai', 'college', 'Chennai', 'State', 'placement@iotchennai.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000006', 'Institute of Technology, Kolkata', 'iot-kolkata', 'college', 'Kolkata', 'State', 'placement@iotkolkata.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000007', 'Institute of Technology, Surat', 'iot-surat', 'college', 'Surat', 'State', 'placement@iotsurat.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000008', 'Institute of Technology, Pune', 'iot-pune', 'college', 'Pune', 'State', 'placement@iotpune.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000009', 'Institute of Technology, Jaipur', 'iot-jaipur', 'college', 'Jaipur', 'State', 'placement@iotjaipur.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000010', 'Institute of Technology, Lucknow', 'iot-lucknow', 'college', 'Lucknow', 'State', 'placement@iotlucknow.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000011', 'Institute of Technology, Kanpur', 'iot-kanpur', 'college', 'Kanpur', 'State', 'placement@iotkanpur.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000012', 'Institute of Technology, Nagpur', 'iot-nagpur', 'college', 'Nagpur', 'State', 'placement@iotnagpur.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000013', 'Institute of Technology, Indore', 'iot-indore', 'college', 'Indore', 'State', 'placement@iotindore.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000014', 'Institute of Technology, Thane', 'iot-thane', 'college', 'Thane', 'State', 'placement@iotthane.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000015', 'Institute of Technology, Bhopal', 'iot-bhopal', 'college', 'Bhopal', 'State', 'placement@iotbhopal.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000016', 'Institute of Technology, Visakhapatnam', 'iot-visakhapatnam', 'college', 'Visakhapatnam', 'State', 'placement@iotvisakhapatnam.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000017', 'Institute of Technology, Pimpri-Chinchwad', 'iot-pimpri-chinchwad', 'college', 'Pimpri-Chinchwad', 'State', 'placement@iotpimprichinchwad.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000018', 'Institute of Technology, Patna', 'iot-patna', 'college', 'Patna', 'State', 'placement@iotpatna.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000019', 'Institute of Technology, Vadodara', 'iot-vadodara', 'college', 'Vadodara', 'State', 'placement@iotvadodara.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000020', 'Institute of Technology, Ghaziabad', 'iot-ghaziabad', 'college', 'Ghaziabad', 'State', 'placement@iotghaziabad.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000021', 'Institute of Technology, Ludhiana', 'iot-ludhiana', 'college', 'Ludhiana', 'State', 'placement@iotludhiana.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000022', 'Institute of Technology, Agra', 'iot-agra', 'college', 'Agra', 'State', 'placement@iotagra.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000023', 'Institute of Technology, Nashik', 'iot-nashik', 'college', 'Nashik', 'State', 'placement@iotnashik.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000024', 'Institute of Technology, Ranchi', 'iot-ranchi', 'college', 'Ranchi', 'State', 'placement@iotranchi.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000025', 'Institute of Technology, Faridabad', 'iot-faridabad', 'college', 'Faridabad', 'State', 'placement@iotfaridabad.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000026', 'Institute of Technology, Meerut', 'iot-meerut', 'college', 'Meerut', 'State', 'placement@iotmeerut.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000027', 'Institute of Technology, Rajkot', 'iot-rajkot', 'college', 'Rajkot', 'State', 'placement@iotrajkot.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000028', 'Institute of Technology, Kalyan-Dombivli', 'iot-kalyan-dombivli', 'college', 'Kalyan-Dombivli', 'State', 'placement@iotkalyandombivli.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000029', 'Institute of Technology, Vasai-Virar', 'iot-vasai-virar', 'college', 'Vasai-Virar', 'State', 'placement@iotvasaivirar.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000030', 'Institute of Technology, Varanasi', 'iot-varanasi', 'college', 'Varanasi', 'State', 'placement@iotvaranasi.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000031', 'Institute of Technology, Srinagar', 'iot-srinagar', 'college', 'Srinagar', 'State', 'placement@iotsrinagar.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000032', 'Institute of Technology, Aurangabad', 'iot-aurangabad', 'college', 'Aurangabad', 'State', 'placement@iotaurangabad.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000033', 'Institute of Technology, Dhanbad', 'iot-dhanbad', 'college', 'Dhanbad', 'State', 'placement@iotdhanbad.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000034', 'Institute of Technology, Amritsar', 'iot-amritsar', 'college', 'Amritsar', 'State', 'placement@iotamritsar.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000035', 'Institute of Technology, Navi Mumbai', 'iot-navi-mumbai', 'college', 'Navi Mumbai', 'State', 'placement@iotnavimumbai.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000036', 'Institute of Technology, Allahabad', 'iot-allahabad', 'college', 'Allahabad', 'State', 'placement@iotallahabad.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000037', 'Institute of Technology, Howrah', 'iot-howrah', 'college', 'Howrah', 'State', 'placement@iothowrah.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000038', 'Institute of Technology, Gwalior', 'iot-gwalior', 'college', 'Gwalior', 'State', 'placement@iotgwalior.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000039', 'Institute of Technology, Jabalpur', 'iot-jabalpur', 'college', 'Jabalpur', 'State', 'placement@iotjabalpur.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000040', 'Institute of Technology, Coimbatore', 'iot-coimbatore', 'college', 'Coimbatore', 'State', 'placement@iotcoimbatore.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000041', 'Institute of Technology, Vijayawada', 'iot-vijayawada', 'college', 'Vijayawada', 'State', 'placement@iotvijayawada.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000042', 'Institute of Technology, Jodhpur', 'iot-jodhpur', 'college', 'Jodhpur', 'State', 'placement@iotjodhpur.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000043', 'Institute of Technology, Madurai', 'iot-madurai', 'college', 'Madurai', 'State', 'placement@iotmadurai.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000044', 'Institute of Technology, Raipur', 'iot-raipur', 'college', 'Raipur', 'State', 'placement@iotraipur.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000045', 'Institute of Technology, Kota', 'iot-kota', 'college', 'Kota', 'State', 'placement@iotkota.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000046', 'Institute of Technology, Guwahati', 'iot-guwahati', 'college', 'Guwahati', 'State', 'placement@iotguwahati.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000047', 'Institute of Technology, Chandigarh', 'iot-chandigarh', 'college', 'Chandigarh', 'State', 'placement@iotchandigarh.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000048', 'Institute of Technology, Solapur', 'iot-solapur', 'college', 'Solapur', 'State', 'placement@iotsolapur.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('c011e9e0-0000-0000-0000-000000000049', 'Institute of Technology, Hubli-Dharwad', 'iot-hubli-dharwad', 'college', 'Hubli-Dharwad', 'State', 'placement@iothublidharwad.edu', 'AICTE', 'A', 2000, 'https://techcorp.com/', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;

-- Replace placeholder phone numbers with realistic seeded values.
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY slug) AS rn
  FROM tenants
  WHERE slug LIKE 'iot-%'
)
UPDATE tenants t
SET phone = '+91-98' || LPAD((10000000 + n.rn - 1)::text, 8, '0')
FROM numbered n
WHERE t.id = n.id
  AND COALESCE(t.phone, '') IN ('', '+91-0000000000');

-- 2. Insert Employer Approvals for TechCorp
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000016', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000017', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000018', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000019', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000020', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000021', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000022', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000023', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000024', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000025', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000026', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000027', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000028', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000029', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000030', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000031', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000032', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000033', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000034', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000035', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000036', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000037', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000038', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000039', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000040', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000041', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000042', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000043', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000044', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000045', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000046', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000047', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000048', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('c011e9e0-0000-0000-0000-000000000049', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;

-- 3. Create a Job Posting for TechCorp to attach to drives
INSERT INTO job_postings (id, employer_id, title, description, job_type, category, locations, salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year, skills_required, vacancies, status) VALUES 
('51a910c2-e517-486d-96e8-c651e9d50c92', 'c1000000-0000-0000-0000-000000000001', 'Software Engineer (Campus Hiring)', 'Campus hiring across various top institutions.', 'full_time', 'Engineering', ARRAY['Bangalore', 'Pune'], 1200000, 1600000, ARRAY['Computer Science & Engineering'], 7.0, 0, 2026, ARRAY['Java', 'Python'], 50, 'published') ON CONFLICT (id) DO NOTHING;

-- 4. Create Placement Drives in 20 Colleges
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('617fc08d-ed0b-4a43-9e3f-3a3e0e05bac0', 'c011e9e0-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Mumbai', 'Recruitment drive for SE role.', 'virtual', '2026-06-08', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 4) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('6fd0eab2-31a5-4526-994b-012fc124d623', 'c011e9e0-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Delhi', 'Recruitment drive for SE role.', 'virtual', '2026-05-11', '09:00', '17:00', 'Virtual/Campus', 'scheduled', 100, 38) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('206e9bc4-3680-417a-898d-c59e0a6c43e3', 'c011e9e0-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Bangalore', 'Recruitment drive for SE role.', 'on_campus', '2026-06-11', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 22) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('24b3751b-877c-4b69-a53d-f74681e08cc0', 'c011e9e0-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Hyderabad', 'Recruitment drive for SE role.', 'virtual', '2026-06-06', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 46) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('4d55d04e-ab2e-47e6-a08d-121e45556b8b', 'c011e9e0-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Ahmedabad', 'Recruitment drive for SE role.', 'virtual', '2026-05-16', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 4) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('0d8eb54a-47f6-477c-ba8e-76a05f59ae1b', 'c011e9e0-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Chennai', 'Recruitment drive for SE role.', 'on_campus', '2026-05-23', '09:00', '17:00', 'Virtual/Campus', 'scheduled', 100, 27) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('a5a2ad4f-bf8b-4cfd-9b72-73dcb6d20be7', 'c011e9e0-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Kolkata', 'Recruitment drive for SE role.', 'on_campus', '2026-06-04', '09:00', '17:00', 'Virtual/Campus', 'scheduled', 100, 49) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('49e8c1ed-1c14-480b-b3a5-5778b37aa2fa', 'c011e9e0-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Surat', 'Recruitment drive for SE role.', 'on_campus', '2026-06-03', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 30) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('cf565ea1-b16a-4041-84e2-e8c4fc5d3c62', 'c011e9e0-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Pune', 'Recruitment drive for SE role.', 'on_campus', '2026-05-15', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 37) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('3006d995-16e7-4095-9dcf-f0acd3584852', 'c011e9e0-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Jaipur', 'Recruitment drive for SE role.', 'virtual', '2026-06-19', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 40) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('7d7fc77c-3ab9-4e24-a598-df8a6caf503d', 'c011e9e0-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Lucknow', 'Recruitment drive for SE role.', 'on_campus', '2026-05-08', '09:00', '17:00', 'Virtual/Campus', 'completed', 100, 42) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('d00c2e51-0a38-419c-a8f0-731d42c46348', 'c011e9e0-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Kanpur', 'Recruitment drive for SE role.', 'on_campus', '2026-05-27', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 27) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('e981cb69-7ffe-4f09-bc92-f53aebd78cbf', 'c011e9e0-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Nagpur', 'Recruitment drive for SE role.', 'on_campus', '2026-05-01', '09:00', '17:00', 'Virtual/Campus', 'completed', 100, 24) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('7d33cf30-2662-431f-aebd-5402122f7a7a', 'c011e9e0-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Indore', 'Recruitment drive for SE role.', 'on_campus', '2026-05-23', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 45) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('63e5c901-cedd-47f2-bc51-86098f3fbda2', 'c011e9e0-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Thane', 'Recruitment drive for SE role.', 'virtual', '2026-05-03', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 48) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('10763ca9-6f3c-4d58-a6d1-f0c5f20ec938', 'c011e9e0-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Bhopal', 'Recruitment drive for SE role.', 'on_campus', '2026-05-02', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 28) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('459cd021-7e0e-453b-a752-19172559a591', 'c011e9e0-0000-0000-0000-000000000016', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Visakhapatnam', 'Recruitment drive for SE role.', 'on_campus', '2026-06-27', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 39) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('efac1e1a-edd0-4e6d-9f99-3e1304237125', 'c011e9e0-0000-0000-0000-000000000017', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Pimpri-Chinchwad', 'Recruitment drive for SE role.', 'on_campus', '2026-05-02', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('9e57c83a-3304-49f7-9420-f489a2325728', 'c011e9e0-0000-0000-0000-000000000018', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Patna', 'Recruitment drive for SE role.', 'virtual', '2026-05-17', '09:00', '17:00', 'Virtual/Campus', 'completed', 100, 37) ON CONFLICT (id) DO NOTHING;
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('4017ea31-93b5-4877-8ac1-5024d8f2d60a', 'c011e9e0-0000-0000-0000-000000000019', 'c1000000-0000-0000-0000-000000000001', '51a910c2-e517-486d-96e8-c651e9d50c92', 'TechCorp Campus Drive at Vadodara', 'Recruitment drive for SE role.', 'on_campus', '2026-05-04', '09:00', '17:00', 'Virtual/Campus', 'approved', 100, 49) ON CONFLICT (id) DO NOTHING;
