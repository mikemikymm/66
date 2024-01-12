"""
# Import necessary modules
from django.shortcuts import render
from django.http import HttpResponse
import pandas as pd
from selenium import webdriver
from bs4 import BeautifulSoup
import time
import random
from datetime import datetime
import os
from .models import GoldPrice 
import csv

# Function to process target table
def process_target_table(soup, data, current_name, current_datetime):
    target_div = soup.find('div', class_='gold_price')
    target_table = target_div.find('table', id='goldTableSum')

    # Extract all rows from the table
    rows = target_table.find_all('tr')

    for row in rows:
        # Extract <td> elements from each row
        td_elements = row.find_all('td')

        for td in td_elements:
            # Get text content
            text_content = td.get_text(strip=True)

            # Extract necessary information
            label = text_content.split(":")[0].strip()
            value = td.find('em').get_text(strip=True)
            unit = td.find('span').get_text(strip=True)

            # Add data to the list
            data.append({
                'Label': label,
                'Value': value,
                'Unit': unit,
                'Name': current_name,
                'SearchTime': current_datetime
            })

            # Print with encoding parameter
            print(f"{label}:{value} {unit}".encode('utf-8').decode('utf-8'))

"""
def is_same_day(file_date, current_date):
    return file_date[:10] == current_date[:10]
"""

# Function to save data to CSV
"""
def save_data_to_csv(data, csv_filename, current_datetime):
    # Convert data to DataFrame using pandas
    df = pd.DataFrame(data)

    # If the file doesn't exist, add header
    if not os.path.isfile(csv_filename):
        df.to_csv(csv_filename, index=False, encoding='utf-8-sig')
    else:
        # If the file is empty, write header
        if os.stat(csv_filename).st_size == 0:
            df.to_csv(csv_filename, index=False, mode='a', header=True, encoding='utf-8-sig')
        else:
            # Read the last line's date from the file
            with open(csv_filename, 'r', encoding='utf-8-sig') as file:
                last_line = file.readlines()[-1]
                last_date = last_line.split(',')[4]

            # Check if the last line's date is the same as the current date
            if is_same_day(last_date, current_datetime.strftime("%Y-%m-%d:%H:%M:%S")):
                print("Data for today already saved. Skipping.")
            else:
                # File is not empty, and the date is different, append data
                df.to_csv(csv_filename, mode='a', header=False, index=False, encoding='utf-8-sig')
"""


def save_data_to_csv(data, csv_filename, current_datetime):
    # Convert data to DataFrame using pandas
    df = pd.DataFrame(data)

    # If the file doesn't exist, add header
    if not os.path.isfile(csv_filename):
        df.to_csv(csv_filename, index=False, encoding='utf-8-sig')
    else:
        # If the file is empty, write header
        if os.stat(csv_filename).st_size == 0:
            df.to_csv(csv_filename, index=False, mode='a', header=True, encoding='utf-8-sig')
        else:
            # Append data to the CSV file
            df.to_csv(csv_filename, mode='a', header=False, index=False, encoding='utf-8-sig')

# Function to scrape gold prices

def save_data_to_database(data, current_datetime_str):
    search_time_str = current_datetime_str

    # Convert the string to a datetime object
    current_datetime = datetime.strptime(current_datetime_str, "%Y:%m:%d:%H:%M:%S")

    for entry in data:
        GoldPrice.objects.create(
            label=entry['Label'],
            value=entry['Value'],
            unit=entry['Unit'],
            name=entry['Name'],
            search_time=current_datetime
        )

"""
# Function to read data from CSV
def read_data_from_csv(csv_filename):
    if os.path.isfile(csv_filename):
        df = pd.read_csv(csv_filename, encoding='utf-8-sig')
        return df.to_dict('records')
    else:
        return []
"""
# Function to scrape gold prices
def gold_prices(request):
    current_datetime = datetime.now().strftime("%Y:%m:%d:%H:%M:%S")

    driver = webdriver.Chrome()
    all_data = []  # Create an empty list to save data

    try:
        url = 'https://quote.cngold.org/gjs/swhj_zdf.html'
        driver.get(url)
        time.sleep(3)
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # Process the initial URL
        current_name = "initial"
        process_target_table(soup, all_data, current_name, current_datetime)

        ul_element = soup.find("ul", class_="gold-menu", id="side")
        for li_element in ul_element.find_all("li"):
            a_element = li_element.find("a")
            if a_element:
                link = a_element['href']
                current_name = a_element.text.strip()
                print(f"Name: {current_name}, URL: {link}")

                driver.get(link)
                sleep_time = random.uniform(1, 4)
                time.sleep(sleep_time)
                sub_soup = BeautifulSoup(driver.page_source, 'html.parser')

                # Process the subpage's target content
                process_target_table(sub_soup, all_data, current_name, current_datetime)

        # Save data to the CSV file
        csv_filename = 'all_golds.csv'
        try:
            save_data_to_csv(all_data, csv_filename, current_datetime)
            print(f"Data successfully saved to {csv_filename}.")

            # Read data from the CSV file
            csv_data = read_data_from_csv(csv_filename)

            # Save data to the database
            try:
                save_data_to_database(csv_data, current_datetime)
                print("Data successfully saved to the database.")
            except Exception as e:
                print(f"An error occurred while saving data to the database: {e}")

        except Exception as e:
            print(f"An error occurred while saving data: {e}")

    finally:
        driver.quit()

    return render(request, 'result_gold_prices.html')



def result_gold_prices(request):
    return render(request, 'result_gold_prices.html')


def gold_prices_template(request): 
    return render(request, 'gold_prices_template.html')

def golds_display(request):
    return render(request, 'golds_display.html')

"""



# Import necessary modules
from django.db.models import Q, F, Count
from django.shortcuts import render
from selenium import webdriver
from bs4 import BeautifulSoup
import time
import random
from datetime import datetime
import os
import pandas as pd
from django.http import HttpResponse
from .models import GoldPrice
from django.shortcuts import render
from django.db import connection
import sqlite3

# Function to process target table
def process_target_table(soup, data, current_name, current_datetime):
    target_div = soup.find('div', class_='gold_price')
    target_table = target_div.find('table', id='goldTableSum')

    # Extract all rows from the table
    rows = target_table.find_all('tr')

    for row in rows:
        # Extract <td> elements from each row
        td_elements = row.find_all('td')

        for td in td_elements:
            # Get text content
            text_content = td.get_text(strip=True)

            # Extract necessary information
            label = text_content.split(":")[0].strip()
            value = td.find('em').get_text(strip=True)
            unit = td.find('span').get_text(strip=True)

            # Add data to the list
            data.append({
                'Label': label,
                'Value': value,
                'Unit': unit,
                'Name': current_name,
                'SearchTime': current_datetime
            })

            # Print with encoding parameter
            print(f"{label}:{value} {unit}".encode('utf-8').decode('utf-8'))

# Function to save data to CSV
def save_data_to_csv(data, csv_filename, current_datetime):
    # Convert data to DataFrame using pandas
    df = pd.DataFrame(data)

    # If the file doesn't exist, add header
    if not os.path.isfile(csv_filename):
        df.to_csv(csv_filename, index=False, encoding='utf-8-sig')
    else:
        # If the file is empty, write header
        if os.stat(csv_filename).st_size == 0:
            df.to_csv(csv_filename, index=False, mode='a', header=True, encoding='utf-8-sig')
        else:
            # Append data to the CSV file
            df.to_csv(csv_filename, mode='a', header=False, index=False, encoding='utf-8-sig')

# Function to scrape gold prices
def gold_prices(request):
    current_datetime = datetime.now().strftime("%Y:%m:%d:%H:%M:%S")

    driver = webdriver.Chrome()
    all_data = []  # Create an empty list to save data

    try:
        url = 'https://quote.cngold.org/gjs/swhj_zdf.html'
        driver.get(url)
        time.sleep(3)
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # Process the initial URL
        current_name = "initial"
        process_target_table(soup, all_data, current_name, current_datetime)

        ul_element = soup.find("ul", class_="gold-menu", id="side")
        for li_element in ul_element.find_all("li"):
            a_element = li_element.find("a")
            if a_element:
                link = a_element['href']
                current_name = a_element.text.strip()
                print(f"Name: {current_name}, URL: {link}")

                driver.get(link)
                sleep_time = random.uniform(1, 4)
                time.sleep(sleep_time)
                sub_soup = BeautifulSoup(driver.page_source, 'html.parser')

                # Process the subpage's target content
                process_target_table(sub_soup, all_data, current_name, current_datetime)

        # Save data to the CSV file
        csv_filename = 'all_golds.csv'
        try:
            save_data_to_csv(all_data, csv_filename, current_datetime)
            print(f"Data successfully saved to {csv_filename}.")

        except Exception as e:
            print(f"An error occurred while saving data: {e}")

    finally:
        driver.quit()

    return render(request, 'result_gold_prices.html')




def result_gold_prices(request):
    return render(request, 'result_gold_prices.html')

from sqlite3 import Error
def gold_prices_template(request):
    return render(request, 'gold_prices_template.html')



def golds_display(request):
    #gold_prices = GoldPrice.objects.all()
    if request.method == 'GET':
        return render(request, 'goldS_display.html')
    else:
        year = request.POST.get('SearchTime','')
        name = request.POST.get('Name','')

        sql_query = f"SELECT * FROM all_golds2 WHERE strftime('%Y', SearchTime) = '{year}' AND name = '{name}';"

    with connection.cursor() as cursor:
        cursor.execute(sql_query)
        gold_prices = cursor.fetchall()

    return render(request, 'golds_display.html', {'gold_prices': gold_prices, 'year': year, 'company_name': name})