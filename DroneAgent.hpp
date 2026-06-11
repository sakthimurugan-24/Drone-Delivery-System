#pragma once

struct Position {
    int x;
    int y;

    bool operator==(const Position& other) const {
        return x == other.x && y == other.y;
    }
};

class DroneAgent {
private:
    int id;
    Position currentPos;
    double batteryLevel;

public:
    DroneAgent(int droneId, int startX, int startY);
    int getId() const;
    Position getPosition() const;
    double getBattery() const;
    void move(int newX, int newY);
    void drainBattery(double amount);
};