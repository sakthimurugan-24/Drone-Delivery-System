#pragma once
#include <vector>
#include <iostream>

class CityGrid {
private:
    int width;
    int height;
    std::vector<std::vector<int>> grid;

public:
    CityGrid(int w, int h);

    void addObstacle(int x, int y);
    bool isValid(int x, int y) const;
    bool isObstacle(int x, int y) const;
    const std::vector<std::vector<int>>& getGrid() const;
    int getWidth() const;
    int getHeight() const;
    void displayGrid() const;
};