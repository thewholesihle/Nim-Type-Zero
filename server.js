const nodemailer = require('nodemailer');
const express = require('express');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 3000;

const myEmail = process.env.EMAIL;

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: myEmail,
        pass: process.env.PASS
    }
})


app.set('view engine', 'ejs');

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded());

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
        from: 'sihle',
        to: myEmail,
        subject: 'Bug Report',
        text: "<h2>You got a Bug Report<h2> <b>Report :<b> <br> <p>${req.body.report}</p>"
    }

    // if user wants to send log data as well
    if (req.body.send_log === 'on') {
        console.log('report includes logs');
        mailOptions = {
            from: 'sihletrinity70@gmail.com',
            to: myEmail,
            subject: 'Bug Report From Nim Type Zero',
            text: 
            `<h2>You got a Bug Report<h2>

           <b>Report :<b> <br> <p>${req.body.report}</p>
            
           <h3>Logs</h3>
           <code>${req.body.logs}</code>
            `,
        };
    }


    //send email
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            res.json('could_not_send');
        } else {
            console.log('Email sent: ' + info.response);
            res.json('email_sent');
        }
    });
})

console.log(myEmail, process.env.PASS);