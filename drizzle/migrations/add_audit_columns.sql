-- Add audit trail columns to contacts table
ALTER TABLE contacts 
  ADD COLUMN createdBy VARCHAR(64) AFTER updatedAt,
  ADD COLUMN updatedBy VARCHAR(64) AFTER createdBy;

-- Add audit trail columns to companies table
ALTER TABLE companies 
  ADD COLUMN createdBy VARCHAR(64) AFTER updatedAt,
  ADD COLUMN updatedBy VARCHAR(64) AFTER createdBy;

-- Add audit trail columns to corporations table
ALTER TABLE corporations 
  ADD COLUMN createdBy VARCHAR(64) AFTER updatedAt,
  ADD COLUMN updatedBy VARCHAR(64) AFTER createdBy;

-- Add audit trail columns to activities table
ALTER TABLE activities 
  ADD COLUMN createdBy VARCHAR(64) AFTER updatedAt,
  ADD COLUMN updatedBy VARCHAR(64) AFTER createdBy;

-- Add audit trail columns to deals table
ALTER TABLE deals 
  ADD COLUMN createdBy VARCHAR(64) AFTER updatedAt,
  ADD COLUMN updatedBy VARCHAR(64) AFTER createdBy;

-- Add foreign key constraints (optional, for referential integrity)
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_createdBy FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_updatedBy FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_companies_createdBy FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE companies ADD CONSTRAINT fk_companies_updatedBy FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE corporations ADD CONSTRAINT fk_corporations_createdBy FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE corporations ADD CONSTRAINT fk_corporations_updatedBy FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE activities ADD CONSTRAINT fk_activities_createdBy FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE activities ADD CONSTRAINT fk_activities_updatedBy FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE deals ADD CONSTRAINT fk_deals_createdBy FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE deals ADD CONSTRAINT fk_deals_updatedBy FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL;
