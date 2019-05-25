// Подключаем необходимые модули для работы сервера
const Express = require('express');
const Mongoose = require('mongoose');
const BodyParser = require('body-parser');
const CookieParser = require('cookie-parser');
const Jwt = require('jsonwebtoken');
// Подключаем модули `config.js` и `models.js`
// Config.js содержит переменную `PORT` `URL` `SECRET`
// `PORT` - порт нашего сервера
// `URl` - адресс удаленной nosql базы данных с паролем для получения доступа к БД
// `SECRET` - секретное слово, используемое для создания jwt
// model.js - две mongoose модели коллекций - users и tasks 
const config = require('./config/config.js');
const Model = require('./models/models.js');
// Включаем фраемворк express в наш проект
const app = Express();
// Говорим что будет использоваться ejs файлы
app.set('view engine', 'ejs');
// Говорим, что будем использовать куки парсер для удобной работы с куки
app.use(CookieParser());
// Говорим, что будем использовать body-parser для работы с json и urlencoded 
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));
// Включаем вывод обращений mongoose к бд, для удобного дебагинга
Mongoose.set('debug', true);
// Подключаемся к БД
// @params{string} config.URL - url адрес БД
Mongoose.connect(config.URL, { useNewUrlParser: true });
// записываем в переменные модели user и task 
const modelUser = Model.user;
const modelTask = Model.task;
// Обработчик get запросов на /index
app.get('/', async(req, res)=>{
  // рисуем index.ejs
  res.render('index');
});
// Обработчик get запросов для /signin
app.get('/signin', async(req, res)=>{
  // Проверяем на наличие access_token у пользователя
  // Если `true` рисуем signin.ejs
  // Если `false` перенаправляем на страницу /main
  if(isEmpty(req.cookies.access_token))
    return res.render('signin');
    else {
      return res.redirect('/main');
    }
});
// Обработчик гет запросов для /register
app.get('/register', async(req, res) =>{
  // рисуем register.ejs
  res.render('register');
});
// Обработчик get запросов для /main
app.get('/main', async(req, res) =>{
  // Проверяем на отсутствие access_token 
  // `true` отправляем пользователя на /index
  // 'false' рисуем main.ejs
  if(!req.cookies.access_token){
    return res.redirect('/');
  }else{
    res.render('main');
  }
});
// Обработчик get запросов для /exit
app.get('/exit', async(req, res)=>{
  // Чистим куки и отправляем на страницу /index
  res.clearCookie('access_token');
  res.redirect('/');
})
// Обработчик post запросов для /main
app.post('/main', async(req, res) =>{
  // Если получили данные - начинаем с ними работать
  // В противном случае отправляем код ошибки 500
  try{
  	// `req.body.command` - содержит команду, необходимую для выполнения запроса
    switch (req.body.command) {
      // `givetask` - запрос на вывод всех задач из БД
      case 'givetask':
      	  // `decoded` - декодирования jwt -> получаем уникальный id пользователя
      	  // Благодаря которому находит task, которые ему принадлежат
      	  // `Jwt.verify` -> на вход сам токен и кодовое слово для декодирования
          let decoded = Jwt.verify(req.body.token, config.SECRET);
          if(!isEmpty(decoded)){
          	// Проверяем на отсутствие данных в декоде
          	// `true` - данные есть
          	// `false` - данные отсутсвуют -> Отправлем ошибку
          	//
          	// Находим принадлежащие юзеру таски из общей коллекции
          	// По полю `id`
            let task = await modelTask.find( {id: decoded} ).exec();
            // Возвращаем таски
            return res.send(task);
          }else{
            return res.json({result: 'Ошибка в построении запроса!'});
          }
        break;
      // `addTask` добавление нового Таска
      case 'addTask':
          let id = Jwt.verify(req.body.token, config.SECRET);
          if(!isEmpty(id) && !isEmpty(req.body.task)){
          	// Создаем новый образец модели Таска -> передаем id пользователя, тело задачи
            let task = new modelTask({id: id, task: req.body.task});
 			// Сохраняем таск в коллекции и возвращаем сохранненый результат клиенту
 			// В случае неудачи - отправляем ошибку
            let result = await task.save((err, result) => { return res.send({_id: result._id, task: result.task}); });
          }else{
            return res.json({error: 'Ошибка в построении запроса!'});
          };
        break;
      // `deltask`Удалить конкретный таск
      case 'deltask':
          if(!isEmpty(req.body.id)){
          	// Делаем запрос на удаление таска -> отправляем уникальный id ТАСКА
          	// Возвращаем code: 1 при успешной операции или error '' в противном случае
            let del = await modelTask.deleteOne({_id: req.body.id}).exec();
            return res.json({result: 'Успешно!', code: '1'});
          }else{
            return res.json({error: 'Ошибка в построении запроса!'});
          }
        break;
      // Если команда для сервера не была понятной - отпрляет ошибку
      default:
        return res.json({result: 'Ошибка в построении запроса!'});

    }
  }catch(error){
    return res.status(500).send(error);
  }
});
// Обработчик post запросов для /register
app.post('/register', async(req, res) =>{
  try{
  	// Проверяем на пустоту логин и пароль пользователя
  	// `true` -> вернем пользователю ошибку, ведь он не ввел какое-то поле
  	// `false` -> продолжим с ним работать
    if(isEmpty(req.body.login) || isEmpty(!req.body.password)){
      return res.json({error: "Не введен пароль или логин"});
    }
    else{
      // В переменную `check` записываем результат запроса нахождение похожего логина
      // Если `check` ничего не вернул -> не нашел, регистрируем пользователя
      // Если что-то вернул -> такой логин уже занят, реторним ошибку
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
// обработчик для теста, в release 1.0 не используется
app.post('/coded', async(req, res)=>{

  var decoded = Jwt.verify(req.body.token, config.SECRET);
  console.log(decoded);
});
// Обработчик пост запросов на `/signin`
app.post('/signin', async(req, res)=>{
  try{
  	//Проверка на пустоту реквеста
  	// `true` -> вернем ошибку
  	// `false` -> работаем дальше
    if(!req.body.login || !req.body.password){
      return res.json({ result: "Ошибка, не все поля заполнены!" });
    }
    else{
    	// В переменную `check` запишем обращение к БД "найди мне похожий логин и верни данные с ним"
    	// Если `check` не пустой, проверяем пароль, что пришел от клиента и тот, что хранится на сервере
    	// Если все правильно - генерируем пользователю токен на 10 минут и сообщаем о результатах
    	// В противном случае реторним ошибку
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
// Начинаем слушать запросы по порту - config.PORT
app.listen(config.PORT, ()=>{
  console.log(`Server listening at: ${config.PORT}...`);
});
// Функция проверки на пустоту
// Принимает объект
// возвращает false если объект не пустой
// true в противном варианте
function isEmpty(obj) {
    for(var key in obj)
    {
        return false;
    }
    return true;
}
