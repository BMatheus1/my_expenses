from app.storage import get_connection


def delete_user_account_data(user_id: str) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            DELETE FROM email_verification_tokens
            WHERE user_id = %s
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM password_reset_tokens
            WHERE user_id = %s
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM refresh_tokens
            WHERE user_id = %s
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM business_sale_materials
            WHERE sale_id IN (
                SELECT business_sales.id
                FROM business_sales
                INNER JOIN businesses
                    ON businesses.id = business_sales.business_id
                WHERE businesses.user_id = %s
            )
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM business_sales
            WHERE business_id IN (
                SELECT id
                FROM businesses
                WHERE user_id = %s
            )
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM business_recipe_items
            WHERE service_id IN (
                SELECT business_services.id
                FROM business_services
                INNER JOIN businesses
                    ON businesses.id = business_services.business_id
                WHERE businesses.user_id = %s
            )
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM business_services
            WHERE business_id IN (
                SELECT id
                FROM businesses
                WHERE user_id = %s
            )
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM business_materials
            WHERE business_id IN (
                SELECT id
                FROM businesses
                WHERE user_id = %s
            )
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM businesses
            WHERE user_id = %s
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM expenses
            WHERE user_id = %s
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM incomes
            WHERE user_id = %s
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM expense_categories
            WHERE user_id = %s
            """,
            (user_id,),
        )

        connection.execute(
            """
            DELETE FROM users
            WHERE id = %s
            """,
            (user_id,),
        )