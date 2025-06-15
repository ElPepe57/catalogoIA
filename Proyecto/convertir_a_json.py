import pandas as pd
import json
import math

# --- CONFIGURACIÓN ---
# Nombre de tu archivo de Excel y las pestañas que creaste
EXCEL_FILE = 'productos.xlsx'
PESTAÑA_PRODUCTOS = 'Productos'
PESTAÑA_VARIANTES = 'Variantes'
JSON_OUTPUT_FILE = 'products.json' # El archivo que usará tu web

# Lee las dos pestañas del archivo de Excel
df_productos = pd.read_excel(EXCEL_FILE, sheet_name=PESTAÑA_PRODUCTOS)
df_variantes = pd.read_excel(EXCEL_FILE, sheet_name=PESTAÑA_VARIANTES)

final_products_list = []

print("Iniciando la conversión de Excel a JSON...")

# Itera sobre cada fila en la pestaña "Productos"
for _, product_row in df_productos.iterrows():
    product_id = product_row['id']

    # Crea el diccionario base del producto
    product_dict = {
        "id": int(product_id),
        "name": product_row['name'],
        "brand": product_row['brand'],
        "category": product_row['category'],
        "shortDescription": product_row['shortDescription'],
        "tags": [tag.strip() for tag in product_row['tags'].split(',')],
        "variants": []
    }

    # Filtra las variantes que pertenecen a este producto
    variants_for_product = df_variantes[df_variantes['productId'] == product_id]

    # Itera sobre cada variante encontrada
    for _, variant_row in variants_for_product.iterrows():
        variant_dict = {
            "variantId": int(variant_row['variantId']),
            "name": variant_row['name'],
            "presentation": variant_row['presentation'],
            "dosage": str(variant_row['dosage']),
            "quantity": str(variant_row['quantity']),
            "images": [img.strip() for img in variant_row['images'].split(',')],
            "pricingTiers": []
        }

        # Construye los niveles de precios (pricingTiers)
        # Tier 1 (Precio base)
        variant_dict["pricingTiers"].append({
            "minQty": 1,
            "price": f"{variant_row['tier1_price']:.2f}",
            "tierName": "Precio Individual"
        })

        # Tier 2 (Opcional)
        if 'tier2_minQty' in variant_row and not pd.isna(variant_row['tier2_minQty']):
             variant_dict["pricingTiers"].append({
                "minQty": int(variant_row['tier2_minQty']),
                "price": f"{variant_row['tier2_price']:.2f}",
                "tierName": f"Mayoreo ({int(variant_row['tier2_minQty'])}+)"
            })

        # Tier 3 (Opcional)
        if 'tier3_minQty' in variant_row and not pd.isna(variant_row['tier3_minQty']):
             variant_dict["pricingTiers"].append({
                "minQty": int(variant_row['tier3_minQty']),
                "price": f"{variant_row['tier3_price']:.2f}",
                "tierName": f"Gran Mayoreo ({int(variant_row['tier3_minQty'])}+)"
            })

        product_dict["variants"].append(variant_dict)

    final_products_list.append(product_dict)

# Añade las definiciones de categorías (puedes gestionarlas aquí o en otra pestaña)
final_json_structure = {
    "products": final_products_list,
    "categoryDefinitions": {
        "sueño": { "title": "Sueño y Relax", "description": "Soluciones naturales para mejorar la calidad del descanso..." },
        "vitaminas": { "title": "Vitaminas Esenciales", "description": "Suplementos vitamínicos fundamentales..." },
        "huesos": { "title": "Salud Ósea y Articular", "description": "Fortalece tus huesos, mantén la flexibilidad..." },
        "cardiovascular": { "title": "Salud Cardiovascular", "description": "Suplementos especializados para mantener un corazón sano..." }
        # Añade las otras categorías aquí
    }
}

# Guarda el diccionario final en el archivo products.json
with open(JSON_OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(final_json_structure, f, ensure_ascii=False, indent=2)

print(f"¡Éxito! El archivo '{JSON_OUTPUT_FILE}' ha sido actualizado con los datos de Excel.")