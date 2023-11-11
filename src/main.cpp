#include <Arduino.h>
#include <WiFi.h>
#include "esp_wifi.h"
#include "SPIFFS.h"
#include <ArduinoJson.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

#define ssid "ESP"

AsyncWebServer server(80);
AsyncEventSource events("/events");

// put function declarations here:
void printConnectedDevices();
void startAccessPoint();
void setupWebPages();
String getValuesJSON();
void sendReadingEvent();

StaticJsonDocument<256> readings;
int AN_In1 = 36; // GPIO 36 is Now AN Input 1
int AN_In2 = 39; // GPIO 39 is Now AN Input 2

void setup()
{
  Serial.begin(115200);

  if (!SPIFFS.begin(true))
  {
    Serial.println("An Error has occurred while mounting SPIFFS");
    return;
  }

  startAccessPoint();
  setupWebPages();
  server.begin();
  Serial.println("HTTP server started");
}

void loop()
{
  if (millis() % 100 == 0)
  {
    // printConnectedDevices();
    // int AN_In1_Value = analogRead(AN_In1);
    // int AN_In2_Value = analogRead(AN_In2);
    // Serial.print("AN1: ");
    // Serial.print(AN_In1_Value);
    // Serial.print(" AN2: ");
    // Serial.println(AN_In2_Value);
    sendReadingEvent();
  }
}

void startAccessPoint()
{
  WiFi.softAP(ssid); // Start Access Point
  Serial.println("Access Point Mode");
}

// Send values to web page
String getValuesJSON()
{
  // Return values in JSON
  readings["AN_In1"] = analogRead(AN_In1);
  readings["AN_In2"] = analogRead(AN_In2);

  String values;
  serializeJson(readings, values);
  return values;
}

// Print all connected devices
void printConnectedDevices()
{
  wifi_sta_list_t stationList; /*Number of connected stations*/
  esp_wifi_ap_get_sta_list(&stationList);
  Serial.print("Connected devices: ");
  Serial.println(stationList.num);
  Serial.println("--------------------");
  for (int i = 0; i < stationList.num; i++)
  {
    wifi_sta_info_t station = stationList.sta[i];
    Serial.print(" ");
    for (int j = 0; j < 6; j++)
    {
      char str[3];
      sprintf(str, "%02x", (int)station.mac[j]); /*prints MAC address of connected station*/
      Serial.print(str);
      if (j < 5)
      {
        Serial.print(":");
      }
    }
    Serial.println();
  }
  Serial.println("--------------------");
  Serial.println();
}

void setupWebPages()
{
  server.serveStatic("/", SPIFFS, "/");

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/index.html", "text/html");
  });

  server.onNotFound([](AsyncWebServerRequest *request) {
    request->send(404, "text/plain", "Not found");
  });

  events.onConnect([](AsyncEventSourceClient *client) {
    if (client->lastId())
    {
      Serial.printf("Client reconnected! Last message ID that it got is: %u\n", client->lastId());
    }
    client->send("hello", NULL, millis(), 1000);
  });

  server.addHandler(&events); 
}

void sendReadingEvent()
{
  events.send(getValuesJSON().c_str(), "newReadings", millis());
}