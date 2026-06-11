#include <iostream>
#include <vector>

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