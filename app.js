const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server started at http://localhost:3000")
    );
  } catch (e) {
    console.log(`Db Error:${e.message}`);
  }
};
initializeDbAndServer();

const playerObjectToResponseObject = (obj) => {
  return {
    playerId: obj.player_id,
    playerName: obj.player_name,
  };
};
const matchObjectToResponseObject = (obj) => {
  return {
    matchId: obj.match_id,
    match: obj.match,
    year: obj.year,
  };
};

app.get("/players/", async (request, response) => {
  const getAllPlayers = `
      SELECT * FROM player_details;
  `;
  const result = await db.all(getAllPlayers);
  response.send(result.map((n) => playerObjectToResponseObject(n)));
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerById = `
      SELECT * FROM player_details WHERE player_id = ${playerId};
  `;
  const result = await db.get(getPlayerById);
  response.send(playerObjectToResponseObject(result));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayer = `
      UPDATE player_details
      SET player_name = '${playerName}'
      WHERE player_id = ${playerId};
  `;
  await db.run(updatePlayer);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchById = `
      SELECT * FROM match_details WHERE match_id = ${matchId};
  `;
  const result = await db.get(getMatchById);
  response.send(matchObjectToResponseObject(result));
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getAllMatchsOfPlayer = `
      SELECT * 
      FROM match_details 
      WHERE match_id IN (SELECT match_id
                        FROM player_match_score
                        WHERE player_id = ${playerId})
  ;`;
  const result = await db.all(getAllMatchsOfPlayer);
  response.send(result.map((n) => matchObjectToResponseObject(n)));
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getAllPlayersOfMatch = `
      SELECT * 
      FROM player_details 
      WHERE player_id IN (SELECT player_id
                        FROM player_match_score
                        WHERE match_id = ${matchId};)
  ;`;
  const result = await db.all(getAllPlayersOfMatch);
  response.send(result.map((n) => playerObjectToResponseObject(n)));
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getStatistics = `
    SELECT
    player_details.player_id,
    player_details.player_name,
    SUM(player_match_score.score) AS total_score,
    SUM(player_match_score.fours) AS total_fours,
    SUM(player_match_score.sixes) AS total_sixes
    FROM
    player_match_score NATURAL JOIN player_details
    WHERE
    player_details.player_id=${playerId};`;
  const stats = await db.get(getStatistics);
  response.send({
    playerId: stats["player_id"],
    playerName: stats["player_name"],
    totalScore: stats["total_score"],
    totalFours: stats["total_fours"],
    totalSixes: stats["total_sixes"],
  });
});
module.exports = app;
