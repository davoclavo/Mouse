/* mouse.js
 *
 * Provides a `Mouse` class, which in most cases there should only be a single of.
 * `mouse` is automatically instantiated on the window and tracks the mouse state independent of specific elements
 * This file also shims in missing behavior such as `buttons`
 */

void function(){
  // figure out what we're checking for scroll offsets
  var scroll = 'pageXOffset' in window
    ? { x: 'pageXOffset', y: 'pageYOffset' }
    : { x: 'scrollX', y: 'scrollY' };


  // instance of MouseEvent to check against
  var test = document.createEvent('MouseEvent');

  // check whether MouseEvent provides "buttons"
  if (!('buttons' in test )) {
    void function(){
      // shimming "buttons" requires keeping track of the buttons
      // buttons are powers of 2 so we can use bitwise operations to handle them
      var mask = 0;
      var count = 0;

      function states(){
        return { left:   (mask & 1) > 0,
                 middle: (mask & 2) > 0,
                 right:  (mask & 4) > 0 };
      }

      function getButtons(){
        return mask;
      }

      Object.defineProperties(MouseEvent.prototype, {
        // provide buttons via accessor
        buttons: { get: getButtons,
                   enumerable: true,
                   configurable: true },
        // interpret the mask as an object
        states: { value: states,
                   configurable: true,
                   writable: true }
      });

      window.addEventListener('mousedown', function(e){
        // add button's bit to mask
        mask |= 1 << e.button;
        count++;
      }, true);

      window.addEventListener('mouseup', function(e){
        // remove button's bit from mask
        if (--count < 0) count = 0;
        if (count)
          mask &= ~(1 << e.button);
        else
          mask = 0;
      }, false);
    }();
  }

  // strip 'mouse' from mouse events to avoid redundency
  var translate = {
    click: 'click',
    contextmenu: 'click',
    dblclick: 'dblclick',
    mousedown: 'down',
    mouseup: 'up',
    mouseover: 'enter',
    mousemove: 'move',
    mouseout: 'leave',
    mousewheel: 'wheel',
    down: 'down',
    up: 'up',
    over: 'over',
    move: 'move',
    out: 'out',
    wheel: 'wheel'
  };

  var untranslate = {};
  Object.keys(translate).forEach(function(name){
    untranslate[translate[name]] = name;
  });

  var allMouse = 'over move out down up wheel click dblclick';

  function Mouse(view){
    var self = this;
    this.view = view;
    this.top = 0;
    this.left = 0;
    this.buttons = 0;
    self.active = false;
    this.listeners = Object.create(null);
    this.lastActivity = Date.now();

    function set(e){
      self.top = e.clientX;
      self.left = e.clientY;
      self.lastActivity = e.timeStamp;
      self.last = e;
      self.buttons = e.buttons;
      this.lastType = e.name;
      self.emit(e);
    }

    function update(e){
      self.active = true;
      set(e);
    }

    'mousemove mousedown mouseup mousewheel click dblclick contextmenu'.split(' ').forEach(function(type){
      view.addEventListener(type, update, true);
    });

    view.addEventListener('mouseover', function(e){
      if (e.relatedTarget === null) {
        self.active = true;
        set(e);
      }
    }, true);

    view.addEventListener('mouseout', function(e){
      if (e.relatedTarget === null) {
        self.active = false;
        set(e);
      }
    }, true);
  }

  // Mouse re-implements the event handlers because it isn't a DOM element nor an EventTarget nor any tangible object
  Mouse.prototype.on = function on(types, handler){
    if (types === '*')
      types = allMouse;

    types.split(' ').forEach(function(type){
      type = translate[type];
      if (!(type in this))
        this[type] = [];
      this[type].push(handler);
    }, this.listeners);
  };

  Mouse.prototype.once = function once(types, handler){
    var self = this;
    types.split(' ').forEach(function(type){
      type = translate[type];
      self.on(type, function single(e){
        self.off(type, single);
        handler.call(self, e);
      });
    });
  };

  Mouse.prototype.off = function off(types, handler){
    if (types === '*')
      types = allMouse;

    types.split(' ').forEach(function(type){
      type = translate[type];
      if (type in this) {
        var index = this[type].indexOf(handler);
        if (~index)
          this[type].splice(index, 1);
      }
    }, this.listeners);
  };

  Mouse.prototype.emit = function emit(event){
    var type = translate[event.type];
    event.name = type;
    if (type in this.listeners) {
      var listeners = this.listeners[type];
      for (var i=0; i < listeners.length; i++)
        listeners[i].call(this, event);
    }
  };

  Window.prototype.Mouse = Mouse;
  window.mouse = new Mouse(window);
}();