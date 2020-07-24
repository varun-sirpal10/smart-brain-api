const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: {
      host : 'postgresql-reticulated-23629',
      user : 'postgres',
      password : '2612',
      database : 'smartbrain'
    }
});

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req,res) => {
    res.send("It is working.");
})

app.post('/signin', (req,res) => {
    const { email,password } = req.body;
    if(!email || !password){
        return res.status(400).json("Incorrect form submission.");
    }
    db.select('email','hash').from('login')
    .where('email','=',email)
    .then((data) => {
        const isValid = bcrypt.compareSync(password,data[0].hash);
        if(isValid){
            db.select('*').from('users').where('email','=',email)
            .then((user) => {
                return res.json(user[0]);
            })
            .catch((err) => {
                return res.status(400).json("Unable to get user.");
            })
        }
        else{
            res.status(400).json("Wrong credentials.");
        }
    })
    .catch((err) => res.status(400).json("Wrong credentials."));
})

app.post('/register', (req,res) => {
    const { email,name,password } = req.body;
    if(!email || !name || !password){
        return res.status(400).json("Incorrect form submission");
    }
    const hash = bcrypt.hashSync(password);
    db.transaction((trx) => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
            .returning('*')
            .insert({
                email: loginEmail[0],
                name: name,
                joined: new Date()
            })
            .then((user) => {
                return res.json(user[0]);
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch((err) => res.status(400).json('Unable to register.'))
})

app.get('/profile/:id', (req,res) => {
    const { id } = req.params;
    db.select('*').from('users').where({
        id: id
    }).then((user) => {
        if(user.length){
            res.json(user[0]);
        }
        else{
            res.status(400).json("Error getting user.");
        }
    })
})

app.put('/image', (req,res) => {
    const { id } = req.body;
    db('users').where('id','=',id)
    .increment('entries',1)
    .returning('entries')
    .then((entries) => {
        res.json(entries[0])
    })
    .catch((err) => res.status(400).json('Unable to get entries.'))
})

app.listen(process.env.PORT || 3000, () => {
    console.log(`App is running on port ${process.env.PORT}`);
})