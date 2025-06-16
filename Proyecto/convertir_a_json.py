import pandas as pd
import json
import math

# --- CONFIGURACIÓN ---
EXCEL_FILE = 'productos.xlsx'
PESTAÑA_PRODUCTOS = 'Productos'
PESTAÑA_VARIANTES = 'Variantes'
JSON_OUTPUT_FILE = 'products.json' 

# Lee las dos pestañas del archivo de Excel
try:
    df_productos = pd.read_excel(EXCEL_FILE, sheet_name=PESTAÑA_PRODUCTOS)
    df_variantes = pd.read_excel(EXCEL_FILE, sheet_name=PESTAÑA_VARIANTES)
except FileNotFoundError:
    print(f"Error: No se encontró el archivo '{EXCEL_FILE}'. Asegúrate de que está en la misma carpeta que el script.")
    exit()
except Exception as e:
    print(f"Error al leer el archivo Excel: {e}")
    exit()

final_products_list = []

print("Iniciando la conversión de Excel a JSON...")

# --- CAMBIO CLAVE: Generar definiciones de categoría dinámicamente ---
# 1. Obtener todas las categorías únicas de la hoja de "Productos"
all_category_keys = df_productos['category'].dropna().unique()

# 2. Mapa predefinido para títulos y descripciones amigables.
# ¡Puedes agregar más aquí si lo necesitas!
category_map = {
    "sueño": {"title": "Sueño y Relax", "description": "Soluciones naturales para mejorar la calidad del descanso, ayudando a conciliar el sueño y disfrutar de un descanso profundo."},
    "vitaminas": {"title": "Vitaminas Esenciales", "description": "Fórmulas completas para toda la familia que apoyan el bienestar general, la energía y el sistema inmune."},
    "huesos": {"title": "Salud Ósea y Articular", "description": "Nutrientes clave como Calcio, Vitamina D, K2 y Glucosamina para fortalecer huesos y mantener la flexibilidad."},
    "cardiovascular": {"title": "Salud Cardiovascular", "description": "Omega-3, antioxidantes y otros nutrientes especializados para mantener un corazón sano y un sistema circulatorio óptimo."},
    "defensas": {"title": "Sistema Inmunológico", "description": "Fortalece tus defensas naturales con extractos herbales y antioxidantes potentes que apoyan la respuesta inmune."},
    "energia": {"title": "Energía y Vitalidad", "description": "Combate la fatiga con adaptógenos y nutrientes que impulsan la energía celular y la vitalidad física y mental."},
    "estres": {"title": "Manejo del Estrés", "description": "Adaptógenos y nutrientes que promueven la calma, reducen la ansiedad y mejoran la respuesta del cuerpo al estrés diario."},
    "cerebro": {"title": "Función Cognitiva", "description": "Potencia tu mente con nootrópicos naturales que apoyan la memoria, la concentración y la claridad mental."},
    "detox": {"title": "Detox y Digestión", "description": "Fórmulas con enzimas, prebióticos y extractos herbales para optimizar la digestión y apoyar la desintoxicación natural."},
    "metabolico": {"title": "Salud Metabólica", "description": "Productos especializados para apoyar un metabolismo saludable, el equilibrio de azúcar en sangre y el control de peso."}
}

# 3. Construir el diccionario de definiciones
dynamic_category_definitions = {}
for key in all_category_keys:
    if key in category_map:
        dynamic_category_definitions[key] = category_map[key]
    else:
        # Si es una categoría nueva no definida en el mapa, crea valores por defecto.
        # Por ejemplo, si la categoría es "salud_mujer", el título será "Salud mujer".
        print(f"INFO: Se encontró una nueva categoría no definida: '{key}'. Se generará un título por defecto.")
        dynamic_category_definitions[key] = {
            "title": key.replace('_', ' ').capitalize(),
            "description": f"Descubre nuestra selección de productos para {key.replace('_', ' ')}."
        }


# Itera sobre cada fila en la pestaña "Productos"
for _, product_row in df_productos.iterrows():
    product_id = product_row['id']
    product_brand = product_row['brand']

    product_dict = {
        "id": int(product_id),
        "name": product_row['name'],
        "brand": product_brand,
        "category": product_row['category'],
        "shortDescription": product_row['shortDescription'],
        "tags": [tag.strip() for tag in str(product_row['tags']).split(',')] if pd.notna(product_row['tags']) else [],
        "variants": []
    }

    variants_for_product = df_variantes[df_variantes['productId'] == product_id]

    for _, variant_row in variants_for_product.iterrows():
        # Asegurarse de que 'images' no sea NaN antes de procesar
        if pd.isna(variant_row['images']):
            print(f"ADVERTENCIA: La variante con ID {variant_row['variantId']} del producto {product_id} no tiene imágenes asignadas. Se dejará en blanco.")
            image_filenames = []
        else:
            image_filenames = [img.strip() for img in str(variant_row['images']).split(',')]
        
        full_image_paths = [f"./images/{product_brand}/{filename}" for filename in image_filenames]

        variant_dict = {
            "variantId": int(variant_row['variantId']),
            "name": variant_row['name'],
            "presentation": variant_row['presentation'],
            "dosage": str(variant_row['dosage']),
            "quantity": str(variant_row['quantity']),
            "images": full_image_paths,
            "pricingTiers": []
        }

        # Construye los niveles de precios (pricingTiers)
        if pd.notna(variant_row.get('tier1_price')):
            variant_dict["pricingTiers"].append({
                "minQty": 1,
                "price": f"{variant_row['tier1_price']:.2f}",
                "tierName": "Precio Individual"
            })

        if 'tier2_minQty' in variant_row and pd.notna(variant_row['tier2_minQty']) and pd.notna(variant_row['tier2_price']):
             variant_dict["pricingTiers"].append({
                "minQty": int(variant_row['tier2_minQty']),
                "price": f"{variant_row['tier2_price']:.2f}",
                "tierName": f"Mayoreo ({int(variant_row['tier2_minQty'])}+)"
            })

        if 'tier3_minQty' in variant_row and pd.notna(variant_row['tier3_minQty']) and pd.notna(variant_row['tier3_price']):
             variant_dict["pricingTiers"].append({
                "minQty": int(variant_row['tier3_minQty']),
                "price": f"{variant_row['tier3_price']:.2f}",
                "tierName": f"Gran Mayoreo ({int(variant_row['tier3_minQty'])}+)"
            })

        product_dict["variants"].append(variant_dict)

    final_products_list.append(product_dict)

# Estructura final del JSON usando las definiciones dinámicas
final_json_structure = {
    "products": final_products_list,
    "categoryDefinitions": dynamic_category_definitions
}

# Guarda el diccionario final en el archivo products.json
with open(JSON_OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(final_json_structure, f, ensure_ascii=False, indent=2)

print(f"\n¡Éxito! El archivo '{JSON_OUTPUT_FILE}' ha sido actualizado con todas las categorías de tu Excel.")
