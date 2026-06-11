#pragma once
#include <vector>
#include "DroneAgent.hpp"

class AStarPathfinder {
public:
    int calculateHeuristic(Position a, Position b);
    std::vector<Position> findPath(
        Position start,
        Position goal,
        const std::vector<std::vector<int>>& grid
    );
};