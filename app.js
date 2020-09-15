require("dotenv").config();
const express = require("express");
const qs = require("querystring");
const got = require("got");

const port = process.env.PORT || 9001;
const app = express();

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const siteUrl = process.env.VERCEL_URL
  ? `https://are-you-following.vercel.app`
  : `http://localhost:${port}`;

app.get("/login", (req, res) => {
  const params = {
    response_type: "code",
    client_id,
    scope: "user-follow-read",
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
            `${client_id}:${client_secret}`
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

    const followResult = await got.get(
      "https://api.spotify.com/v1/me/following/contains",
      {
        headers: {
          Authorization: `Bearer ${tokenResult.body.access_token}`,
        },
        searchParams: {
          type: "artist",
          ids: "7vO5wOUwek3MmX40zYgOem",
        },
        responseType: "json",
      }
    );

    if (followResult.body[0] === true) {
      res.status(200).send("You do follow My Pet Fauxes");
    } else {
      res.status(200).send("You do not follow My Pet Fauxes");
    }
  } catch (e) {
    res.status(400).send("Unable to complete request");
  }
});

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});

module.exports = app;
