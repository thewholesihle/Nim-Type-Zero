const nodemailer = require('nodemailer');
const {
    google
} = require('googleapis');
const oauth2 = google.auth.OAuth2;
const express = require('express');
const app = express();

const port = process.env.PORT || 3000;

const myEmail = process.env.EMAIL;

const oauth2Client = new oauth2(
    process.env.CLIENT_ID, // ClientID
    process.env.CLIENT_SECRET, // Client Secret
    "https://developers.google.com/oauthplayground" // Redirect URL
);

oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN
});

const accessToken = oauth2Client.getAccessToken().catch(err => {})
const smtpTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: process.env.EMAIL,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken
    },
    tls: {
        rejectUnauthorized: false
    }
});


app.set('view engine', 'ejs');

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }))
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.listen(port, console.log(`server running on ${port}`));

app.use(express.static('public')); // static files

app.get('/', (req, res) => {
    res.status(200).render('index');
    res.end();
})

app.post('/report', (req, res) => {
    let mailOptions = {
        from: myEmail,
        to: 'sihletrinity70@gmail.com',
        subject: 'Bug Report',
        generateTextFromHTML: true,
        html: "<h2>You got a Bug Report<h2> <b>Report :<b> <br> <p>${req.body.report}</p>"
    }

    // if user wants to send log data as well
    if (req.body.send_log === 'on') {
        console.log('report includes logs');
        mailOptions = {
            from: myEmail,
            to: 'sihletrinity70@gmail.com',
            subject: 'Bug Report: Nim Type Zero',
            generateTextFromHTML: true,
            html: `<h2>You got a Bug Report<h2>
            <p>Hey! someone reported a bug, let's smash it good.</p>
            <b><u>Report</u><b>
            <p>${req.body.report}</p>
            <br>
            <details>
            <summary>Show Logs</summary>
            <code style="background: #2b2d42; color: #edf2f4; padding: 1rem;">${req.body.logs}</code>
          </details>`,
        };
    }


    //send email
    smtpTransport.sendMail(mailOptions, (error, response) => {
        if (error) {
            res.json('email_not_sent');
            console.log(error);
        } else {
            res.json('email_sent')
            console.log(response);
        }
        smtpTransport.close();
    });
})
