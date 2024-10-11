#include <Arduino.h>
#include <WiFi.h>
#include "esp_wifi.h"
#include "SPIFFS.h"
#include <ArduinoJson.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ESPmDNS.h>

#define localSSID "ESP"

AsyncWebServer server(80);
AsyncEventSource events("/events");

// put function declarations here:
void printConnectedDevices();
void startAccessPoint();
void setupWebPages();
String getValuesJSON();
void sendReadingEvent();
void connectToWiFi();

StaticJsonDocument<256> readings;

int inputPin1 = 5;
int inputPin2 = 4;

int CONNECTION_ATTEMPTS = 5;

int COOLDOWN = 100;

void setup()
{
	Serial.begin(115200);

	if (!SPIFFS.begin(true))
	{
		Serial.println("An Error has occurred while mounting SPIFFS");
		return;
	}

	// Check if wifi credentials are stored
	if (SPIFFS.exists("/wifi.txt"))
	{
		Serial.println("Wifi credentials found");
		File file = SPIFFS.open("/wifi.txt");
		String ssid = file.readStringUntil('\n');
		String password = file.readStringUntil('\n');
		file.close();

		// Remove white spaces
		ssid.trim();
		password.trim();

		Serial.println("Connecting to WiFi");
		Serial.println(ssid);
		Serial.println(password);

		WiFi.begin(ssid.c_str(), password.c_str());

		while (WiFi.status() != WL_CONNECTED)
		{
			delay(500);
			Serial.println(WiFi.status());

			if (CONNECTION_ATTEMPTS == 0)
			{
				Serial.println("Could not connect to WiFi");
				startAccessPoint();
				break;
			}

			CONNECTION_ATTEMPTS--;

			// Wait 1s
			delay(1000);
		}

		Serial.println();
		Serial.println("WiFi connected");
		Serial.println("IP address: ");
		Serial.println(WiFi.localIP());
		printConnectedDevices();
	}
	else
	{
		Serial.println("No wifi credentials found");
		startAccessPoint();
	}

	setupWebPages();
	server.begin();
	Serial.println("HTTP server started");

	if (MDNS.begin("ESP"))
	{
		Serial.println("MDNS responder started");
	}

	// Set AN_In1 and AN_In2 as inputs high
	pinMode(inputPin1, INPUT_PULLUP);
	pinMode(inputPin2, INPUT_PULLUP);
}

void loop()
{
	if (millis() % 100 == 0)
	{
		sendReadingEvent();
	}
}

void startAccessPoint()
{
	WiFi.softAP(localSSID); // Start Access Point
	Serial.println("Access Point Mode");
}

// Send values to web page
String getValuesJSON()
{
	// Return values in JSON
	readings["inputPin1"] = digitalRead(inputPin1) ? false : true;
	readings["inputPin2"] = digitalRead(inputPin2) ? false : true;

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

	server.on("/", HTTP_GET, [](AsyncWebServerRequest *request)
			  { request->send(SPIFFS, "/index.html", "text/html"); });

	server.onNotFound([](AsyncWebServerRequest *request)
					  { request->send(404, "text/plain", "Not found"); });

	server.addHandler(&events);

	server.onRequestBody([](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
						 {
	Serial.println(request->url());

	if(request->url() == "/saveWifiSettingsFile")
	{

		Serial.printf("BodyStart: %u B\n", total);

		String ssid = "";
		String password = "";

		// First line is ssid
		for(size_t i=0; i<len; i++){
			if(data[i] == '\n'){
			break;
			}
			ssid += (char)data[i];
		}

		// Second line is password
		for(size_t i=ssid.length()+1; i<total; i++){
			if(data[i] == '\n'){
			break;
			}
			password += (char)data[i];
		}

		Serial.println(ssid);
		Serial.println(password);

		File file = SPIFFS.open("/wifi.txt", FILE_WRITE);
		// Write to fie
		if (!file)
		{
			Serial.println("There was an error opening the file for writing");
			return;
		}
		else{
			file.println(ssid);
			file.println(password);
		}
		file.close();

		// Response 200
		request->send(200, "text/plain", "File saved");

		ESP.restart();
	} });
}

bool isInputPin1 = false;
bool isInputPin2 = false;

void sendReadingEvent()
{
	// Check if state has changed
	if (isInputPin1 != digitalRead(inputPin1) || isInputPin2 != digitalRead(inputPin2))
	{
		isInputPin1 = digitalRead(inputPin1);
		isInputPin2 = digitalRead(inputPin2);

		events.send(getValuesJSON().c_str(), "newReadings", millis());
	
		delay(COOLDOWN);
	}
	else
	{
		return;
	}
}