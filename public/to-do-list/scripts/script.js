// Create a new Vue instance
new Vue({

  // Bind Vue instance to container div with an ID of todo
  el: "#todo",

  // Data values of list
  data: {
    newTask: "",
    taskList: [],
    activeEdit: null
  },

  // Computed properties in list
  computed: {
    areAllChecked: function() {
      // Check if every checked property returns true and if there is at least one to-do item
      return this.taskList.every(function(task) {
        return task.checked;
      }) && this.taskList.length > 0;
    }
  },

  // Methods for list
  methods: {
    addTask: function() {
      var task = this.newTask.trim();
      // If task is not an empty string
      if (task) {
        // Push an object containing the task into the taskList array
        this.taskList.push({
          text: task,
          checked: false,
        });
        // Reset newTask to empty string
        this.newTask = "";
      }
    },
    removeTask: function(task) {
      // Delete task from array at current index using splice
      var index = this.taskList.indexOf(task);
      this.taskList.splice(index, 1);
    },
    editTask: function(task) {
      // Edit task at current index
      this.activeEdit = task
    },
    doneEdit(task) {
      // Save edited task
      if (!this.activeEdit) {
        return
      }
      this.activeEdit = null
      task.text = task.text.trim()
    },
    clearList: function() {
      // Reset taskList to empty array
      this.taskList = [];
    },
    checkAll: function() {
      // targetValue is set to the opposite of areAllChecked
      var targetValue = this.areAllChecked ? false : true;
      // Set the checked state of all items to the target value
      for (var i = 0, j = this.taskList.length; i < j; i++) {
        this.taskList[i].checked = targetValue;
      }
    }
  }

});
