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
app.post('/signin', async(req, res)=>{
  try{
    if(!req.body.login || !req.body.password){
      return res.json({ error: "Не введен пароль или логин!" });
    }
    else{
        var check = await modelUser.findOne({login: req.body.login}).exec();
        if(check.length != 0 && check.password == req.body.password){
          return res.send(`Вы вошли как ${check.login}`);
        } else{
          return res.send("Неправильный логин или пароль!");
        }
    };
  }catch(error){
    res.status(500).send(error);
  }
})
app.post('/register', async(req, res) =>{
  try{
    if(!req.body.login || !req.body.password){
      return res.json({error: "Не введен пароль или логин"});
    }
    else{
      var check = await modelUser.findOne({login: req.body.login}).exec();
      if(check.length == 0){
        var user = new modelUser(req.body);
        var result = await user.save();
        return res.send(`Вы успешно зарегистрировались как ${result.login}, теперь вы можете авторизоваться!`);
      }else{
        return res.json({ error: "Данный логин уже используется в системе :(" });
      }
    };
  }catch(error){
    return res.status(500).send(error);
  };
})

app.listen(config.PORT, ()=>{
  console.log(`Server listening at: ${config.PORT}...`);
})
