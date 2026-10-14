CREATE DATABASE IF NOT EXISTS hostel_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE hostel_management;

CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_number VARCHAR(50) NOT NULL,
  capacity INT UNSIGNED NOT NULL DEFAULT 2,
  room_type ENUM('AC', 'Non-AC') NOT NULL DEFAULT 'Non-AC',
  status ENUM('available', 'full', 'maintenance') NOT NULL DEFAULT 'available',
  price_per_month DECIMAL(10, 2) NOT NULL,
  room_pic LONGTEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_rooms_room_number (room_number),
  CONSTRAINT chk_rooms_capacity CHECK (capacity > 0),
  CONSTRAINT chk_rooms_price CHECK (price_per_month >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff', 'resident') NOT NULL DEFAULT 'resident',
  contact_number VARCHAR(30) NULL,
  address TEXT NULL,
  profile_pic LONGTEXT NULL,
  guardian_name VARCHAR(150) NULL,
  emergency_contact VARCHAR(30) NULL,
  blood_group VARCHAR(20) NULL,
  course_details VARCHAR(255) NULL,
  id_proof LONGTEXT NULL,
  assigned_room_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_assigned_room (assigned_room_id),
  CONSTRAINT fk_users_assigned_room
    FOREIGN KEY (assigned_room_id) REFERENCES rooms (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Room occupants are queried through users.assigned_room_id rather than stored twice.
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resident_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('Low', 'Medium', 'High', 'Emergency') NOT NULL DEFAULT 'Low',
  status ENUM('Pending', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Pending',
  issue_pic LONGTEXT NULL,
  resolved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_maintenance_resident_created (resident_id, created_at),
  KEY idx_maintenance_status_priority (status, priority),
  CONSTRAINT fk_maintenance_resident
    FOREIGN KEY (resident_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS billing_invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resident_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NULL,
  month VARCHAR(100) NOT NULL,
  room_fee DECIMAL(10, 2) NOT NULL,
  additional_service VARCHAR(255) NOT NULL DEFAULT '',
  additional_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  late_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('Pending', 'Paid', 'Failed') NOT NULL DEFAULT 'Pending',
  due_date DATETIME(3) NOT NULL,
  transaction_id VARCHAR(150) NULL,
  gateway_reference VARCHAR(255) NULL,
  paid_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_billing_resident_month (resident_id, month),
  KEY idx_billing_room (room_id),
  KEY idx_billing_transaction (transaction_id),
  KEY idx_billing_status_due_date (status, due_date),
  CONSTRAINT chk_billing_amounts CHECK (
    room_fee >= 0 AND additional_amount >= 0 AND discount >= 0
    AND late_fee >= 0 AND total_amount >= 0
  ),
  CONSTRAINT fk_billing_resident
    FOREIGN KEY (resident_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_billing_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('maintenance', 'billing', 'room', 'general') NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notifications_recipient_read_created (recipient_id, is_read, created_at),
  CONSTRAINT fk_notifications_recipient
    FOREIGN KEY (recipient_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Legacy model: the current API uses billing_invoices, not this separate bills table.
CREATE TABLE IF NOT EXISTS bills (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resident_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  status ENUM('unpaid', 'paid', 'overdue') NOT NULL DEFAULT 'unpaid',
  due_date DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_bills_resident_due_date (resident_id, due_date),
  CONSTRAINT chk_bills_amount CHECK (amount >= 0),
  CONSTRAINT fk_bills_resident
    FOREIGN KEY (resident_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;