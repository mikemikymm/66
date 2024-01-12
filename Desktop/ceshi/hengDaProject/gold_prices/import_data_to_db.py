import csv
from datetime import datetime
'''
def import_data_to_db(csv_filename):
    with open(csv_filename, 'r', encoding='utf-8-sig') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            # Convert the string to a datetime object
            search_time = datetime.strptime(row['SearchTime'], "%Y-%m-%d:%H:%M:%S")

            # Create a new GoldPrice object and save it to the database
            GoldPrice.objects.create(
                label=row['Label'],
                value=row['Value'],
                unit=row['Unit'],
                name=row['Name'],
                search_time=search_time
            )
'''


from sqlite3 import Error
import sqlite3
import os
import subprocess
def create_connection(db_file):
    try:
        # Connect to the database
        conn = sqlite3.connect(db_file)
        print('连接成功!!!?')
        return conn
    except Error as e:
        print(f'连接失败: {e}')
        return None

def import_csv_to_database(csv_filename, db_filename, table_name):
    # Check if the CSV file exists
    if not os.path.isfile(csv_filename):
        print(f"CSV file '{csv_filename}' not found.")
        return

    # Check if the database file exists
    if not os.path.isfile(db_filename):
        print(f"Database file '{db_filename}' not found.")
        return

    try:
        # Run SQLite3 command to import CSV into the database
        command = f'sqlite3 {db_filename} ".mode csv" ".import {csv_filename} {table_name}"'
        result = subprocess.run(command, shell=True, check=True, stdout=subprocess.PIPE)

        # Print the standard output
        print(result.stdout.decode())

        print(f"CSV file '{csv_filename}' imported to '{table_name}' table in '{db_filename}'.")
    except subprocess.CalledProcessError as e:
        print(f"Error during CSV import: {e}")


def select_all_records(conn, table_name):
    try:
        cursor = conn.cursor()

        # Fetch the records before deletion
        select_before_delete_query = f"SELECT * FROM {table_name} WHERE Name = 'initial'"
        cursor.execute(select_before_delete_query)
        records_before_delete = cursor.fetchall()

        # Execute the DELETE query
        delete_query = f"DELETE FROM {table_name} WHERE Name = 'initial'"
        cursor.execute(delete_query)

        # Commit the changes to the database
        conn.commit()

        # Fetch the records after deletion
        select_after_delete_query = f"SELECT * FROM {table_name}"
        cursor.execute(select_after_delete_query)
        records_after_delete = cursor.fetchall()

        # Print the records before and after deletion
        print(f"Records before deletion: {records_before_delete}")
        print(f"Records after deletion: {records_after_delete}")

        # Close the cursor
        cursor.close()

        return records_after_delete

    except Error as e:
        print(f'Query execution failed: {e}')
        return None

def execute_sql_query(conn, sql_query):
    try:
        # Create a cursor
        cursor = conn.cursor()

        # Execute the SQL query
        cursor.execute(sql_query)

        # Fetch the result (if any)
        result = cursor.fetchall()

        # Commit the changes to the database
        conn.commit()

        # Close the cursor
        cursor.close()

        return result
    except Error as e:
        print(f'SQL query execution failed: {e}')
        return None



'''
def remove_duplicate_records(conn):
    try:
        cursor = conn.cursor()

        # Remove duplicate records with the same date, label, and value
        duplicate_query = """
            DELETE FROM gold_prices_goldprice 
            WHERE (Date, Label, Value) IN (
                SELECT Date, Label, Value
                FROM gold_prices_goldprice
                GROUP BY Date, Label, Value
                HAVING COUNT(*) > 1
            )
        """
        cursor.execute(duplicate_query)

        # Commit the changes to the database
        conn.commit()

        # Close the cursor
        cursor.close()

    except Error as e:
        print(f'Error during duplicate records removal: {e}')

def update_id_sequence(conn):
    try:
        cursor = conn.cursor()

        # Update id to maintain sequential order
        update_id_query = """
            UPDATE gold_prices_goldprice
            SET id = id - 1
            WHERE id > (
                SELECT id
                FROM gold_prices_goldprice
                ORDER BY id
                LIMIT 1
            )
        """
        cursor.execute(update_id_query)

        # Commit the changes to the database
        conn.commit()

        # Close the cursor
        cursor.close()

    except Error as e:
        print(f'Error during id sequence update: {e}')

'''
'''
def only_save_onedate(conn):
    try:
        cursor = conn.cursor()

        # Update id to maintain sequential order
        update_id_query = """
            UPDATE gold_prices_goldprice
            SET id = id - 1
            WHERE id > (
                SELECT id
                FROM gold_prices_goldprice
                ORDER BY id
                LIMIT 1
            )
""
        cursor.execute(update_id_query)

        # Commit the changes to the database
        conn.commit()

        # Close the cursor
        cursor.close()

    except Error as e:
        print(f'Error during id sequence update: {e}')

'''
def close_connection(conn):
    if conn:
        # Close the connection
        conn.close()
        print('连接已关闭')

if __name__ == "__main__":
    # Database file path
    db_file = '/Users/mikemikymm/Desktop/ceshi/hengDaProject/db.sqlite3'
    csv_filename = 'all_golds.csv'
    table_name = 'gold_prices_goldprice'

    # Attempt to create a connection to the database
    connection = create_connection(db_file)

    # Check if the connection is successful or not
    if connection:
        try:
            # Call the function to select all records
            result = select_all_records(connection, "gold_prices_goldprice")

            # Perform other SQL operations as needed

        finally:
            # Close the database connection
            close_connection(connection)
