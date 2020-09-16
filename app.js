require("dotenv").config();
const express = require("express");
const qs = require("querystring");
const got = require("got");
const path = require("path");
const bodyParser = require("body-parser");
const { allowedNodeEnvironmentFlags } = require("process");

const port = process.env.PORT || 9001;
const app = express();

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const isOnVercel = !!process.env.VERCEL_URL;
const siteUrl = isOnVercel
  ? "https://follow.mypetfauxes.com"
  : `http://localhost:${port}`;

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "static")));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  const params = {
    response_type: "code",
    client_id: spotifyClientId,
    scope: "user-follow-read user-follow-modify",
    redirect_uri: `${siteUrl}/done/`,
  };
  res.redirect(
    "https://accounts.spotify.com/authorize?" + qs.stringify(params)
  );
});

app.get("/done", async (req, res) => {
  try {
    const tokenResult = await got.post(
      "https://accounts.spotify.com/api/token",
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${spotifyClientId}:${spotifyClientSecret}`
          ).toString("base64")}`,
        },
        form: {
          grant_type: "authorization_code",
          code: req.query.code,
          redirect_uri: `${siteUrl}/done/`,
        },
        responseType: "json",
      }
    );
    res.redirect(`/following?t=${tokenResult.body.access_token}`);
  } catch (e) {
    res.status(400).send("Unable to complete request");
  }
});

app.get("/following", async (req, res) => {
  const accessToken = req.query.t;
  const followResult = await got.get(
    "https://api.spotify.com/v1/me/following/contains",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      searchParams: {
        type: "artist",
        ids: "7vO5wOUwek3MmX40zYgOem",
      },
      responseType: "json",
    }
  );
  res.render("done", {
    following: followResult.body[0],
    accessToken,
  });
});

app.post("/follow", async (req, res) => {
  await got.put("https://api.spotify.com/v1/me/following", {
    headers: {
      Authorization: `Bearer ${req.body.accessToken}`,
      "Content-Type": "application/json",
    },
    searchParams: {
      type: "artist",
      ids: "7vO5wOUwek3MmX40zYgOem",
    },
    responseType: "json",
  });
  res.render("done", {
    following: true,
  });
});

if (!isOnVercel) {
  app.get("/done-test", (req, res) => {
    const following = req.query.following
      ? req.query.following === "true"
      : true;
    res.render("done", { following, accessToken: "blah" });
  });
}

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});

module.exports = app;
