from sqlite3 import Error
import sqlite3

def create_connection(db_file):
    try:
        # 连接到数据库
        conn = sqlite3.connect(db_file)
        print('连接成功!!!')
        return conn
    except Error as e:
        print(f'连接失败: {e}')
        return None

def execute_sql_queries(conn, sql_queries):
    try:
        # 创建一个游标
        cursor = conn.cursor()

        # 依次执行每个 SQL 查询
        for sql_query in sql_queries:
            # 执行 SQL 查询
            cursor.execute(sql_query)

            # 获取结果（如果有的话）
            result = cursor.fetchall()

            # 提交对数据库的更改
            conn.commit()

            # 打印结果（如果有的话）
            if result:
                print(result)

        # 关闭游标
        cursor.close()

    except Error as e:
        print(f'SQL 查询执行失败: {e}')

def close_connection(conn):
    if conn:
        # 关闭连接
        conn.close()
        print('连接已关闭')

if __name__ == "__main__":
    # 文件路径
    db_file = '/Users/mikemikymm/Desktop/ceshi/hengDaProject/db.sqlite3'

    # 尝试创建到数据库的连接
    connection = create_connection(db_file)

    # Check if the connection is successful or not
    if connection:
        try:

            sql_queries = [

                """
                CREATE TABLE all_golds2 AS
                SELECT 
                    *,
                    CASE 
                        WHEN INSTR(SearchTime, '-') > 0 THEN 
                            SUBSTR(SearchTime, 1, 4) || ':' || SUBSTR(SearchTime, 6, 2) || ':' || SUBSTR(SearchTime, 9, 2)
                        ELSE 
                            SUBSTR(SearchTime, 1, 10)
                    END AS FormattedDate
                FROM 
                    all_golds;
                """,

            ]

            # 调用执行 SQL 查询的函数
            execute_sql_queries(connection, sql_queries)

        finally:
            # 关闭数据库连接
            close_connection(connection)
