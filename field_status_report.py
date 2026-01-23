#!/usr/bin/env python3
"""
Analyse aller neuen Felder in FRIDAY CRM
"""

import re

# Read files
with open('drizzle/schema.ts', 'r') as f:
    schema = f.read()

with open('server/routers.ts', 'r') as f:
    routers = f.read()

# Extract all field definitions from schema
def extract_fields_from_table(table_name):
    pattern = rf'export const {table_name} = mysqlTable\("{table_name}", \{{([^}}]+)\}}'
    match = re.search(pattern, schema, re.DOTALL)
    if not match:
        return []
    
    table_def = match.group(1)
    field_pattern = r'(\w+):\s*(?:varchar|text|bigint|boolean|int|decimal|timestamp|mysqlEnum)'
    fields = re.findall(field_pattern, table_def)
    return fields

# Check if field is in API
def check_field_in_api(table_name, field_name, operation):
    # Find the router section
    router_pattern = rf'{table_name}: router\(\{{([^}}]+?{operation}[^}}]+?)\}}\)'
    router_match = re.search(router_pattern, routers, re.DOTALL)
    if not router_match:
        return False
    
    router_section = router_match.group(1)
    return field_name in router_section

# Standard fields (nicht Genesis)
standard_fields = {
    'id', 'createdAt', 'updatedAt', 'name', 'email', 'loginMethod', 
    'role', 'status', 'partnerId', 'lastSignedIn', 'firstName', 'lastName'
}

print("=" * 80)
print("FRIDAY CRM - FELDSTATUS-BERICHT")
print("=" * 80)

# Analyze each table
tables_to_check = [
    ('corporations', ['create', 'update']),
    ('companies', ['create']),
    ('contacts', ['create']),
    ('deals', ['create']),
    ('activities', ['create']),
]

for table_name, operations in tables_to_check:
    print(f"\n### {table_name.upper()} ###\n")
    
    fields = extract_fields_from_table(table_name)
    
    # Filter out standard fields
    new_fields = [f for f in fields if f not in standard_fields]
    
    if not new_fields:
        print("  Keine neuen Felder")
        continue
    
    for field in new_fields:
        status_parts = []
        for op in operations:
            has_api = check_field_in_api(table_name, field, op)
            status_parts.append(f"{op}: {'✓' if has_api else '✗'}")
        
        status_str = ", ".join(status_parts)
        print(f"  {field:25} [{status_str}]")

print("\n" + "=" * 80)
print("LEGENDE:")
print("  ✓ = Feld ist in API integriert")
print("  ✗ = Feld fehlt in API")
print("=" * 80)
