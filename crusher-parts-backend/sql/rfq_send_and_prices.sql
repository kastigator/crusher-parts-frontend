-- RFQ send/documents + supplier part price history

ALTER TABLE rfqs
  ADD COLUMN sent_at DATETIME DEFAULT NULL,
  ADD COLUMN sent_by_user_id INT DEFAULT NULL,
  ADD CONSTRAINT fk_rfqs_sent_by FOREIGN KEY (sent_by_user_id) REFERENCES users(id);

CREATE TABLE rfq_documents (
  id INT NOT NULL AUTO_INCREMENT,
  rfq_id INT NOT NULL,
  rfq_supplier_id INT DEFAULT NULL,
  document_type VARCHAR(32) NOT NULL DEFAULT 'rfq',
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) DEFAULT NULL,
  file_size INT DEFAULT NULL,
  file_url TEXT NOT NULL,
  template_version VARCHAR(32) DEFAULT NULL,
  payload_hash VARCHAR(64) DEFAULT NULL,
  payload_json JSON DEFAULT NULL,
  created_by_user_id INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rfq_docs_rfq (rfq_id),
  KEY idx_rfq_docs_supplier (rfq_supplier_id),
  CONSTRAINT fk_rfq_docs_rfq
    FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE,
  CONSTRAINT fk_rfq_docs_supplier
    FOREIGN KEY (rfq_supplier_id) REFERENCES rfq_suppliers(id) ON DELETE SET NULL,
  CONSTRAINT fk_rfq_docs_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE supplier_part_prices (
  id INT NOT NULL AUTO_INCREMENT,
  supplier_part_id INT NOT NULL,
  material_id INT DEFAULT NULL,
  price DECIMAL(12,4) NOT NULL,
  currency CHAR(3) DEFAULT NULL,
  date DATE NOT NULL,
  comment TEXT,
  offer_type ENUM('OEM','ANALOG','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  lead_time_days INT DEFAULT NULL,
  min_order_qty INT DEFAULT NULL,
  packaging VARCHAR(100) DEFAULT NULL,
  validity_days INT DEFAULT NULL,
  source_type VARCHAR(32) DEFAULT NULL,
  source_id INT DEFAULT NULL,
  created_by_user_id INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_spp_supplier_part (supplier_part_id),
  KEY idx_spp_source (source_type, source_id),
  KEY idx_spp_date (date),
  CONSTRAINT fk_spp_supplier_part
    FOREIGN KEY (supplier_part_id) REFERENCES supplier_parts(id) ON DELETE CASCADE,
  CONSTRAINT fk_spp_material
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
  CONSTRAINT fk_spp_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);
