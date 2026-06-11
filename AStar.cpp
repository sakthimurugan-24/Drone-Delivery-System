#include "AStar.hpp"
#include <queue>
#include <map>
#include <set>
#include <vector>
#include <algorithm>
#include <cmath>

struct PQNode {
    Position pos;
    int fCost;
    int gCost;

    bool operator>(const PQNode& other) const {
        return fCost > other.fCost;
    }
};

static bool isValidCell(int x, int y, const std::vector<std::vector<int>>& grid) {
    return y >= 0 && y < (int)grid.size() &&
           x >= 0 && x < (int)grid[0].size() &&
           grid[y][x] == 0;
}

int AStarPathfinder::calculateHeuristic(Position a, Position b) {
    return std::abs(a.x - b.x) + std::abs(a.y - b.y);
}

std::vector<Position> AStarPathfinder::findPath(
    Position start,
    Position goal,
    const std::vector<std::vector<int>>& grid
) {
    std::priority_queue<PQNode, std::vector<PQNode>, std::greater<PQNode>> openSet;
    std::map<std::pair<int, int>, int> gScore;
    std::map<std::pair<int, int>, std::pair<int, int>> parent;
    std::set<std::pair<int, int>> closedSet;

    openSet.push({start, calculateHeuristic(start, goal), 0});
    gScore[{start.x, start.y}] = 0;

    std::vector<Position> directions = {
        {1, 0}, {-1, 0}, {0, 1}, {0, -1}
    };

    while (!openSet.empty()) {
        PQNode current = openSet.top();
        openSet.pop();

        std::pair<int, int> currKey = {current.pos.x, current.pos.y};

        if (closedSet.count(currKey)) continue;
        closedSet.insert(currKey);

        if (current.pos == goal) {
            std::vector<Position> path;
            std::pair<int, int> step = {goal.x, goal.y};

            path.push_back(goal);
            while (step != std::make_pair(start.x, start.y)) {
                step = parent[step];
                path.push_back({step.first, step.second});
            }

            std::reverse(path.begin(), path.end());
            return path;
        }

        for (const auto& d : directions) {
            int nx = current.pos.x + d.x;
            int ny = current.pos.y + d.y;

            if (!isValidCell(nx, ny, grid)) continue;

            std::pair<int, int> neighborKey = {nx, ny};
            int tentativeG = current.gCost + 1;

            if (!gScore.count(neighborKey) || tentativeG < gScore[neighborKey]) {
                gScore[neighborKey] = tentativeG;
                parent[neighborKey] = currKey;
                int h = calculateHeuristic({nx, ny}, goal);
                openSet.push({{nx, ny}, tentativeG + h, tentativeG});
            }
        }
    }

    return {};
}   