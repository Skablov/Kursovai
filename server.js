const Express = require('express');
const Mongoose = require('mongoose');
const BodyParser = require('body-parser');
const CookieParser = require('cookie-parser');
//const Crypto = require('crypto');
const Jwt = require('jsonwebtoken');

const config = require('./config/config.js');
const Model = require('./models/models.js');
const app = Express();

app.set('view engine', 'ejs');
app.use(CookieParser());
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

Mongoose.set('debug', true); // Просим Mongoose выводить все обращения к БД в консоль (крутая фишка для отладки кода)
Mongoose.connect(config.URL, { useNewUrlParser: true });

const modelUser = Model.user;
const modelTask = Model.task;

app.get('/', async(req, res)=>{
  res.render('index');
});
app.get('/signin', async(req, res)=>{
    res.render('signin');
});
app.get('/register', async(req, res) =>{
  res.render('register');
});
app.get('/main', async(req, res) =>{
  if(!req.cookies.access_token){
    return res.redirect('/');
  }else{
    res.render('main');
  }
});

app.post('/main', async(req, res) =>{
  try{
    switch (req.body.command) {
      case 'givetask':
          let decoded = Jwt.verify(req.body.token, config.SECRET);
          if(!isEmpty(decoded)){
            let task = await modelTask.find( {id: decoded} ).exec();
            return res.send(task);
          }else{
            return res.json({result: 'Ошибка в построении запроса!'});
          }
        break;
      case 'addTask':
          let id = Jwt.verify(req.body.token, config.SECRET);
          if(!isEmpty(id) && !isEmpty(req.body.task)){
            let task = new modelTask({id: id, task: req.body.task});
            let result = await task.save();
            return res.json({result: 'Успешно!', code: '1'});
          }else{
            return res.json({error: 'Ошибка в построении запроса!'});
          };
        break;
      case 'deltask':
          if(!isEmpty(req.body.id)){
            let del = await modelTask.deleteOne({_id: req.body.id}).exec();
            return res.json({result: 'Успешно!', code: '1'});
          }else{
            return res.json({error: 'Ошибка в построении запроса!'});
          }
        break;
      default:
        return res.json({result: 'Ошибка в построении запроса!'});

    }
  }catch(error){
    return res.status(500).send(error);
  }
});
app.post('/register', async(req, res) =>{
  try{
    if(isEmpty(req.body.login) || isEmpty(!req.body.password)){
      return res.json({error: "Не введен пароль или логин"});
    }
    else{
      var check = await modelUser.findOne({login: req.body.login}).exec();
      if(isEmpty(check)){
        var user = new modelUser(req.body);
        var result = await user.save();
        return res.send(`Вы успешно зарегистрировались как ${result.login}, теперь вы можете авторизоваться!<br><a href='/signin'>Авторизация</a>`);
      }else{
        return res.json({ error: "Данный логин уже используется в системе :(" });
      }
    };
  }catch(error){
    return res.status(500).send(error);
  };
});
app.post('/coded', async(req, res)=>{

  var decoded = Jwt.verify(req.body.token, config.SECRET);
  console.log(decoded);
});
app.post('/signin', async(req, res)=>{
  try{
    if(!req.body.login || !req.body.password){
      return res.json({ result: "Ошибка, не все поля заполнены!" });
    }
    else{
        var check = await modelUser.findOne({login: req.body.login}).exec();
        if(!isEmpty(check) && check.password == req.body.password){
          res.cookie('access_token', `${Jwt.sign(check.id, config.SECRET)}`, { expires: new Date(Date.now() + 900000)});
          res.json({result: "Успешно авторизовались!"});
        }else{
          return res.json({result: "Неправильный логин или пароль!"});
        }
    };
  }catch(error){
    res.status(500).send(error);
    console.log(`Ошибка в signin ${error}`);
    return error;
  }
});

app.listen(config.PORT, ()=>{
  console.log(`Server listening at: ${config.PORT}...`);
});

function isEmpty(obj) {
    for(var key in obj)
    {
        return false;
    }
    return true;
}
