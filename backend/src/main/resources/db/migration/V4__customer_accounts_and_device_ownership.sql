INSERT INTO roles (name) VALUES ('CUSTOMER');

ALTER TABLE users
    ADD CONSTRAINT uk_users_email UNIQUE (email);

ALTER TABLE devices
    ADD COLUMN customer_id BIGINT;

ALTER TABLE devices
    ADD CONSTRAINT fk_devices_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_devices_customer ON devices(customer_id);
