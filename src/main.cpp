#include <Arduino.h>
#include <WiFi.h>
#include "esp_wifi.h"
#include <WebServer.h>
#include "SPIFFS.h"

#define ssid "ESP"

WebServer server(80);

// put function declarations here:
void printConnectedDevices();
void startAccessPoint();
void setupWebPages();

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

static unsigned long lastTime = millis();
static unsigned long interval = 5000;

void loop()
{
  server.handleClient();

  // Print connected devices every 5 seconds
  if (millis() - lastTime > interval)
  {
    lastTime = millis();
    // printConnectedDevices();
  }
}

void startAccessPoint()
{
  WiFi.softAP(ssid); // Start Access Point
  Serial.println("Access Point Mode");
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
  
  // Redirect to index page
  server.onNotFound ([]() {
    server.sendHeader("Location", String("/index.html"), true);
    server.send(302, "text/plain", "");
  });
}