Mongoose = require('mongoose');
var User = Mongoose.model('user', {
  login: String,
  password: String
});
var Task = Mongoose.model('task', {
  id: String,
  task: String
})
module.exports.user = User;
module.exports.task = Task;
