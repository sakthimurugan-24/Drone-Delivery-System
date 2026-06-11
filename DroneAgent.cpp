#include "DroneAgent.hpp"

DroneAgent::DroneAgent(int droneId, int startX, int startY) {
    id = droneId;
    currentPos = {startX, startY};
    batteryLevel = 100.0;
}

int DroneAgent::getId() const {
    return id;
}

Position DroneAgent::getPosition() const {
    return currentPos;
}

double DroneAgent::getBattery() const {
    return batteryLevel;
}

void DroneAgent::move(int newX, int newY) {
    currentPos = {newX, newY};
}

void DroneAgent::drainBattery(double amount) {
    batteryLevel -= amount;
    if (batteryLevel < 0) batteryLevel = 0;
}