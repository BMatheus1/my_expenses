from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from app.storage import get_connection


def to_float(value) -> float:
    if value is None:
        return 0.0

    if isinstance(value, Decimal):
        return float(value)

    return float(value)


def initialize_business_database() -> None:
    with get_connection() as connection:
        create_businesses_table(connection)
        create_business_materials_table(connection)
        create_business_services_table(connection)
        create_business_recipe_items_table(connection)
        create_business_sales_table(connection)
        create_business_sale_materials_table(connection)
        create_business_indexes(connection)


def create_businesses_table(connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS businesses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL
        )
        """
    )


def create_business_materials_table(connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS business_materials (
            id TEXT PRIMARY KEY,
            business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            stock_quantity NUMERIC(12, 3) NOT NULL,
            unit TEXT NOT NULL,
            unit_cost NUMERIC(12, 4) NOT NULL,
            total_cost NUMERIC(12, 2) NOT NULL,
            supplier TEXT,
            purchase_date DATE NOT NULL,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL
        )
        """
    )


def create_business_services_table(connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS business_services (
            id TEXT PRIMARY KEY,
            business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price NUMERIC(12, 2) NOT NULL,
            estimated_minutes INTEGER,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL
        )
        """
    )


def create_business_recipe_items_table(connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS business_recipe_items (
            id TEXT PRIMARY KEY,
            business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            service_id TEXT NOT NULL REFERENCES business_services(id) ON DELETE CASCADE,
            material_id TEXT NOT NULL REFERENCES business_materials(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            quantity_used NUMERIC(12, 3) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            UNIQUE(service_id, material_id)
        )
        """
    )


def create_business_sales_table(connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS business_sales (
            id TEXT PRIMARY KEY,
            business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            service_id TEXT NOT NULL REFERENCES business_services(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            service_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price NUMERIC(12, 2) NOT NULL,
            total_amount NUMERIC(12, 2) NOT NULL,
            total_material_cost NUMERIC(12, 2) NOT NULL,
            gross_profit NUMERIC(12, 2) NOT NULL,
            gross_margin_percent NUMERIC(8, 2) NOT NULL,
            sale_date DATE NOT NULL,
            payment_method TEXT NOT NULL,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL
        )
        """
    )


def create_business_sale_materials_table(connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS business_sale_materials (
            id TEXT PRIMARY KEY,
            sale_id TEXT NOT NULL REFERENCES business_sales(id) ON DELETE CASCADE,
            material_id TEXT NOT NULL,
            material_name TEXT NOT NULL,
            unit TEXT NOT NULL,
            quantity_used NUMERIC(12, 3) NOT NULL,
            unit_cost NUMERIC(12, 4) NOT NULL,
            total_cost NUMERIC(12, 2) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL
        )
        """
    )


def create_business_indexes(connection) -> None:
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_businesses_user
        ON businesses(user_id)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_business_materials_business
        ON business_materials(user_id, business_id)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_business_services_business
        ON business_services(user_id, business_id)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_business_sales_date
        ON business_sales(user_id, business_id, sale_date DESC)
        """
    )


def list_businesses(user_id: str) -> list[dict]:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT id, name, type, description, created_at
            FROM businesses
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()


def get_business_by_id(business_id: str, user_id: str) -> dict | None:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT id, user_id, name, type, description, created_at
            FROM businesses
            WHERE id = %s AND user_id = %s
            """,
            (business_id, user_id),
        ).fetchone()


def create_business(data: dict, user_id: str) -> dict:
    business_id = str(uuid4())
    created_at = datetime.now(timezone.utc)

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO businesses (
                id, user_id, name, type, description, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                business_id,
                user_id,
                data["name"],
                data["type"],
                data.get("description"),
                created_at,
            ),
        )

    return get_business_by_id(business_id, user_id)


def update_business(business_id: str, data: dict, user_id: str) -> dict | None:
    with get_connection() as connection:
        return connection.execute(
            """
            UPDATE businesses
            SET name = %s, type = %s, description = %s
            WHERE id = %s AND user_id = %s
            RETURNING id, name, type, description, created_at
            """,
            (
                data["name"],
                data["type"],
                data.get("description"),
                business_id,
                user_id,
            ),
        ).fetchone()


def delete_business(business_id: str, user_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM businesses
            WHERE id = %s AND user_id = %s
            """,
            (business_id, user_id),
        )

        return cursor.rowcount > 0


def list_materials(business_id: str, user_id: str) -> list[dict]:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT
                id,
                business_id,
                name,
                category,
                stock_quantity,
                unit,
                unit_cost,
                total_cost,
                supplier,
                purchase_date,
                notes,
                created_at
            FROM business_materials
            WHERE business_id = %s AND user_id = %s
            ORDER BY LOWER(name)
            """,
            (business_id, user_id),
        ).fetchall()


def get_material_by_id(
    business_id: str,
    material_id: str,
    user_id: str,
) -> dict | None:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT
                id,
                business_id,
                user_id,
                name,
                category,
                stock_quantity,
                unit,
                unit_cost,
                total_cost,
                supplier,
                purchase_date,
                notes,
                created_at
            FROM business_materials
            WHERE id = %s AND business_id = %s AND user_id = %s
            """,
            (material_id, business_id, user_id),
        ).fetchone()


def create_material(business_id: str, data: dict, user_id: str) -> dict:
    material_id = str(uuid4())
    stock_quantity = to_float(data["stock_quantity"])
    total_cost = to_float(data["total_cost"])
    unit_cost = round(total_cost / stock_quantity, 4)
    created_at = datetime.now(timezone.utc)

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO business_materials (
                id,
                business_id,
                user_id,
                name,
                category,
                stock_quantity,
                unit,
                unit_cost,
                total_cost,
                supplier,
                purchase_date,
                notes,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                material_id,
                business_id,
                user_id,
                data["name"],
                data["category"],
                stock_quantity,
                data["unit"],
                unit_cost,
                total_cost,
                data.get("supplier"),
                data["purchase_date"],
                data.get("notes"),
                created_at,
            ),
        )

    return get_material_by_id(business_id, material_id, user_id)


def update_material(
    business_id: str,
    material_id: str,
    data: dict,
    user_id: str,
) -> dict | None:
    stock_quantity = to_float(data["stock_quantity"])
    total_cost = to_float(data["total_cost"])
    unit_cost = round(total_cost / stock_quantity, 4)

    with get_connection() as connection:
        return connection.execute(
            """
            UPDATE business_materials
            SET
                name = %s,
                category = %s,
                stock_quantity = %s,
                unit = %s,
                unit_cost = %s,
                total_cost = %s,
                supplier = %s,
                purchase_date = %s,
                notes = %s
            WHERE id = %s AND business_id = %s AND user_id = %s
            RETURNING
                id,
                business_id,
                name,
                category,
                stock_quantity,
                unit,
                unit_cost,
                total_cost,
                supplier,
                purchase_date,
                notes,
                created_at
            """,
            (
                data["name"],
                data["category"],
                stock_quantity,
                data["unit"],
                unit_cost,
                total_cost,
                data.get("supplier"),
                data["purchase_date"],
                data.get("notes"),
                material_id,
                business_id,
                user_id,
            ),
        ).fetchone()


def delete_material(business_id: str, material_id: str, user_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM business_materials
            WHERE id = %s AND business_id = %s AND user_id = %s
            """,
            (material_id, business_id, user_id),
        )

        return cursor.rowcount > 0


def list_services(business_id: str, user_id: str) -> list[dict]:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT
                id,
                business_id,
                user_id,
                name,
                category,
                price,
                estimated_minutes,
                notes,
                created_at
            FROM business_services
            WHERE business_id = %s AND user_id = %s
            ORDER BY created_at DESC
            """,
            (business_id, user_id),
        ).fetchall()


def get_service_by_id(
    business_id: str,
    service_id: str,
    user_id: str,
) -> dict | None:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT
                id,
                business_id,
                user_id,
                name,
                category,
                price,
                estimated_minutes,
                notes,
                created_at
            FROM business_services
            WHERE id = %s AND business_id = %s AND user_id = %s
            """,
            (service_id, business_id, user_id),
        ).fetchone()


def create_service(business_id: str, data: dict, user_id: str) -> dict:
    service_id = str(uuid4())
    created_at = datetime.now(timezone.utc)

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO business_services (
                id,
                business_id,
                user_id,
                name,
                category,
                price,
                estimated_minutes,
                notes,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                service_id,
                business_id,
                user_id,
                data["name"],
                data["category"],
                data["price"],
                data.get("estimated_minutes"),
                data.get("notes"),
                created_at,
            ),
        )

    return get_service_by_id(business_id, service_id, user_id)


def update_service(
    business_id: str,
    service_id: str,
    data: dict,
    user_id: str,
) -> dict | None:
    with get_connection() as connection:
        return connection.execute(
            """
            UPDATE business_services
            SET
                name = %s,
                category = %s,
                price = %s,
                estimated_minutes = %s,
                notes = %s
            WHERE id = %s AND business_id = %s AND user_id = %s
            RETURNING
                id,
                business_id,
                user_id,
                name,
                category,
                price,
                estimated_minutes,
                notes,
                created_at
            """,
            (
                data["name"],
                data["category"],
                data["price"],
                data.get("estimated_minutes"),
                data.get("notes"),
                service_id,
                business_id,
                user_id,
            ),
        ).fetchone()


def delete_service(business_id: str, service_id: str, user_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM business_services
            WHERE id = %s AND business_id = %s AND user_id = %s
            """,
            (service_id, business_id, user_id),
        )

        return cursor.rowcount > 0


def list_recipe_items(service_id: str, user_id: str) -> list[dict]:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT
                bri.id,
                bri.service_id,
                bri.material_id,
                bm.name AS material_name,
                bm.category AS material_category,
                bri.quantity_used,
                bm.unit,
                bm.unit_cost,
                bm.stock_quantity,
                bri.quantity_used * bm.unit_cost AS total_cost,
                bri.created_at
            FROM business_recipe_items bri
            INNER JOIN business_materials bm ON bm.id = bri.material_id
            WHERE bri.service_id = %s AND bri.user_id = %s
            ORDER BY LOWER(bm.name)
            """,
            (service_id, user_id),
        ).fetchall()


def get_recipe_item_by_id(
    recipe_item_id: str,
    service_id: str,
    user_id: str,
) -> dict | None:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT id, business_id, service_id, material_id, user_id, quantity_used, created_at
            FROM business_recipe_items
            WHERE id = %s AND service_id = %s AND user_id = %s
            """,
            (recipe_item_id, service_id, user_id),
        ).fetchone()


def upsert_recipe_item(
    business_id: str,
    service_id: str,
    material_id: str,
    quantity_used: float,
    user_id: str,
) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO business_recipe_items (
                id,
                business_id,
                service_id,
                material_id,
                user_id,
                quantity_used,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (service_id, material_id)
            DO UPDATE SET quantity_used = EXCLUDED.quantity_used
            """,
            (
                str(uuid4()),
                business_id,
                service_id,
                material_id,
                user_id,
                quantity_used,
                datetime.now(timezone.utc),
            ),
        )


def update_recipe_item(
    recipe_item_id: str,
    service_id: str,
    quantity_used: float,
    user_id: str,
) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE business_recipe_items
            SET quantity_used = %s
            WHERE id = %s AND service_id = %s AND user_id = %s
            """,
            (quantity_used, recipe_item_id, service_id, user_id),
        )

        return cursor.rowcount > 0


def delete_recipe_item(
    recipe_item_id: str,
    service_id: str,
    user_id: str,
) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM business_recipe_items
            WHERE id = %s AND service_id = %s AND user_id = %s
            """,
            (recipe_item_id, service_id, user_id),
        )

        return cursor.rowcount > 0


def list_sales(business_id: str, user_id: str) -> list[dict]:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT
                id,
                business_id,
                service_id,
                service_name,
                quantity,
                unit_price,
                total_amount,
                total_material_cost,
                gross_profit,
                gross_margin_percent,
                sale_date,
                payment_method,
                notes,
                created_at
            FROM business_sales
            WHERE business_id = %s AND user_id = %s
            ORDER BY sale_date DESC, created_at DESC
            """,
            (business_id, user_id),
        ).fetchall()


def create_sale_with_stock_update(
    business_id: str,
    service: dict,
    recipe_items: list[dict],
    data: dict,
    user_id: str,
) -> dict:
    sale_id = str(uuid4())
    quantity = int(data["quantity"])
    unit_price = to_float(data["unit_price"] or service["price"])
    total_amount = round(unit_price * quantity, 2)
    total_material_cost = round(
        sum(to_float(item["total_cost"]) * quantity for item in recipe_items),
        2,
    )
    gross_profit = round(total_amount - total_material_cost, 2)
    gross_margin_percent = calculate_margin(gross_profit, total_amount)
    created_at = datetime.now(timezone.utc)

    with get_connection() as connection:
        for item in recipe_items:
            required_quantity = to_float(item["quantity_used"]) * quantity
            available_quantity = to_float(item["stock_quantity"])

            if available_quantity < required_quantity:
                raise ValueError(
                    f"Estoque insuficiente para {item['material_name']}."
                )

        connection.execute(
            """
            INSERT INTO business_sales (
                id,
                business_id,
                service_id,
                user_id,
                service_name,
                quantity,
                unit_price,
                total_amount,
                total_material_cost,
                gross_profit,
                gross_margin_percent,
                sale_date,
                payment_method,
                notes,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                sale_id,
                business_id,
                service["id"],
                user_id,
                service["name"],
                quantity,
                unit_price,
                total_amount,
                total_material_cost,
                gross_profit,
                gross_margin_percent,
                data["sale_date"],
                data["payment_method"],
                data.get("notes"),
                created_at,
            ),
        )

        for item in recipe_items:
            required_quantity = round(to_float(item["quantity_used"]) * quantity, 3)
            unit_cost = to_float(item["unit_cost"])
            material_total_cost = round(required_quantity * unit_cost, 2)

            connection.execute(
                """
                UPDATE business_materials
                SET stock_quantity = stock_quantity - %s
                WHERE id = %s AND business_id = %s AND user_id = %s
                """,
                (
                    required_quantity,
                    item["material_id"],
                    business_id,
                    user_id,
                ),
            )

            connection.execute(
                """
                INSERT INTO business_sale_materials (
                    id,
                    sale_id,
                    material_id,
                    material_name,
                    unit,
                    quantity_used,
                    unit_cost,
                    total_cost,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    str(uuid4()),
                    sale_id,
                    item["material_id"],
                    item["material_name"],
                    item["unit"],
                    required_quantity,
                    unit_cost,
                    material_total_cost,
                    created_at,
                ),
            )

    return get_sale_by_id(sale_id, user_id)


def get_sale_by_id(sale_id: str, user_id: str) -> dict | None:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT
                id,
                business_id,
                service_id,
                service_name,
                quantity,
                unit_price,
                total_amount,
                total_material_cost,
                gross_profit,
                gross_margin_percent,
                sale_date,
                payment_method,
                notes,
                created_at
            FROM business_sales
            WHERE id = %s AND user_id = %s
            """,
            (sale_id, user_id),
        ).fetchone()


def calculate_margin(profit: float, revenue: float) -> float:
    if revenue <= 0:
        return 0

    return round((profit / revenue) * 100, 2)