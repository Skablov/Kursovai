const Express = require('express');
const Mongoose = require('mongoose');
const BodyParser = require('body-parser');
const Model = require('./models/models.js');

const config = require('./config/config.js');
const app = Express();

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

Mongoose.connect(config.URL, { useNewUrlParser: true });
const modelUser = Model.user;

app.post('/person', async(req, res) =>{
  try{
    if(!req.body.login || !req.body.password){
      return res.json({error: "Не введен пароль или логин"});
    }
    else{
      var user = new modelUser(req.body);
      var result = await user.save();
      res.send(result);
    };
  }catch(error){
    res.status(500).send(error);
  };
})

app.listen(config.PORT, ()=>{
  console.log(`Server listening at: ${config.PORT}...`);
})
