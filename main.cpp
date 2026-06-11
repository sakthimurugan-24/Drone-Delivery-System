#include <iostream>
#include <vector>
#include <fstream>
#include <algorithm>
#include "DroneAgent.hpp"
#include "AStar.hpp"

class CityGrid {
private:
    int width;
    int height;
    std::vector<std::vector<int>> grid;

public:
    CityGrid(int w, int h) : width(w), height(h) {
        grid.resize(height, std::vector<int>(width, 0));
    }

    void addObstacle(int x, int y) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            grid[y][x] = 1;
        }
    }

    const std::vector<std::vector<int>>& getGrid() const {
        return grid;
    }

    void displayGrid() const {
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                if (grid[y][x] == 1) std::cout << "█ ";
                else std::cout << ". ";
            }
            std::cout << "\n";
        }
    }
};

bool willCollide(const Position& aNext, const Position& bNext) {
    return aNext.x == bNext.x && aNext.y == bNext.y;
}

int main() {
    CityGrid city(10, 10);

    for (int y = 0; y <= 7; ++y) {
        city.addObstacle(5, y);
    }

    std::cout << "City Grid:\n";
    city.displayGrid();

    DroneAgent drone1(1, 0, 0);
    DroneAgent drone2(2, 0, 9);

    Position goal1 = {9, 9};
    Position goal2 = {9, 0};

    AStarPathfinder pathfinder;
    std::vector<Position> path1 = pathfinder.findPath(drone1.getPosition(), goal1, city.getGrid());
    std::vector<Position> path2 = pathfinder.findPath(drone2.getPosition(), goal2, city.getGrid());

    if (path1.empty() || path2.empty()) {
        std::cout << "No valid path found for one or more drones.\n";
        return 1;
    }

    std::ofstream outFile("paths.txt");
    if (!outFile.is_open()) {
        std::cout << "Error opening paths.txt\n";
        return 1;
    }

    double windFactor = 0.30;
    double trafficFactor = 0.20;
    double rainFactor = 0.10;
    double batteryDrainPerMove = 1.0 + windFactor + trafficFactor + rainFactor;

    size_t maxSteps = std::max(path1.size(), path2.size());
    int collisionsAvoided = 0;

    std::cout << "\nSimulation Started:\n";

    Position prev1 = drone1.getPosition();
    Position prev2 = drone2.getPosition();

    for (size_t i = 0; i < maxSteps; ++i) {
        Position next1 = (i < path1.size()) ? path1[i] : prev1;
        Position next2 = (i < path2.size()) ? path2[i] : prev2;

        if (willCollide(next1, next2)) {
            collisionsAvoided++;
            next2 = prev2;
        }

        if (!(next1 == prev1)) {
            drone1.move(next1.x, next1.y);
            drone1.drainBattery(batteryDrainPerMove);
            prev1 = next1;
        }

        if (!(next2 == prev2)) {
            drone2.move(next2.x, next2.y);
            drone2.drainBattery(batteryDrainPerMove);
            prev2 = next2;
        }

        outFile << "STEP," << i << "\n";
        outFile << "D1," << prev1.x << "," << prev1.y << "," << drone1.getBattery() << "\n";
        outFile << "D2," << prev2.x << "," << prev2.y << "," << drone2.getBattery() << "\n";
        outFile << "META," << collisionsAvoided << "," << windFactor << "," << rainFactor << "," << trafficFactor << "\n";

        std::cout << "Step " << i
                  << " | D1=(" << prev1.x << "," << prev1.y << ") Battery=" << drone1.getBattery()
                  << " | D2=(" << prev2.x << "," << prev2.y << ") Battery=" << drone2.getBattery()
                  << " | Collisions Avoided=" << collisionsAvoided << "\n";
    }

    outFile.close();

    std::cout << "\nSimulation finished.\n";
    std::cout << "Paths saved to paths.txt\n";
    std::cout << "Final Battery D1: " << drone1.getBattery() << "\n";
    std::cout << "Final Battery D2: " << drone2.getBattery() << "\n";
    std::cout << "Collisions Avoided: " << collisionsAvoided << "\n";

    return 0;
}