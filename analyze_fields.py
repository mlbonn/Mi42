import re

# Read schema
with open('drizzle/schema.ts', 'r') as f:
    schema = f.read()

# Read routers
with open('server/routers.ts', 'r') as f:
    routers = f.read()

# Genesis fields from contacts table
genesis_contact_fields = [
    'keyword1', 'keyword2', 'companySize', 'responsiblePerson',
    'function', 'department', 'category', 'tags',
    'phoneBusiness', 'phoneMobile', 'phoneOffice', 'faxOffice'
]

# Genesis fields from corporations table
genesis_corp_fields = ['companySize', 'stage']

print("=== GENESIS CONTACT FIELDS ===")
for field in genesis_contact_fields:
    in_create = field in routers and 'contacts.create' in routers
    in_update = field in routers and 'contacts.update' in routers
    print(f"{field}: create={'✓' if field in routers[routers.find('contacts: router'):routers.find('contacts: router')+2000] else '✗'}, update={'?' }")

print("\n=== GENESIS CORPORATION FIELDS ===")
for field in genesis_corp_fields:
    print(f"{field}: {'✓' if field in routers[routers.find('corporations: router'):routers.find('corporations: router')+2000] else '✗'}")

print("\n=== ALL TABLES WITH NEW FIELDS ===")
tables = re.findall(r'export const (\w+) = mysqlTable', schema)
for table in tables:
    print(f"- {table}")
