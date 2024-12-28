/*******************************************************
 * index.js
 * 
 * 1) Setup an Express server (no DB connection yet).
 * 2) Return mock objects for demonstration.
 *******************************************************/
import express from 'express';
const app = express();
const port = 3000;

// Mock data:
const player_data = {
    playerName: "Omigod",
    totalExp: 0,
};

const player_basic_stats = {
    int_stat: 5,
    str_stat: 3,
    dex_stat: 3,
    con_stat: 4
};

const player_main_stats = {
    health: 100,
    mana: 150
};

const player_items = {
    weapon: "basic_staff",
    armor_head: null,
    armor_chest: null,
    armor_shoulders: null,
    armor_legs: null,
    armor_feet: null
};

const player_backpack = {
    cell_0_0: 0, cell_0_1: 0, cell_0_2: 0, cell_0_3: 0, cell_0_4: 0,
    cell_1_0: 0, cell_1_1: 0, cell_1_2: 0, cell_1_3: 0, cell_1_4: 0,
    cell_2_0: null, cell_2_1: null, cell_2_2: null, cell_2_3: null, cell_2_4: null,
    cell_3_0: null, cell_3_1: null, cell_3_2: null, cell_3_3: null, cell_3_4: null,
    cell_4_0: null, cell_4_1: null, cell_4_2: null, cell_4_3: null, cell_4_4: null,
    cell_5_0: null, cell_5_1: null, cell_5_2: null, cell_5_3: null, cell_5_4: null
};

// Middleware to parse JSON (optional if we do POST requests later)
app.use(express.json());

// Basic route to test the server
app.get('/', (req, res) => {
  res.send('Welcome to PixelGrinder backend (mock version)!');
});

// Endpoint that returns player data
app.get('/api/player', (req, res) => {
  const mockResponse = {
    player_data,
    player_basic_stats,
    player_main_stats,
    player_items,
    player_backpack
  };
  res.json(mockResponse);
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
