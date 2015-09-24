var header = document.getElementById('waypoint')
bottom = document.getElementById('bottom-header')
var waypoint = new Waypoint({
  element: header,
  handler: function(direction) {
  	if (direction === 'down') {
  		bottom.className = 'bottom-header visible';
  	} else{
  		bottom.className = 'bottom-header hidden';
  	};

  },
  offset: '-10px'
})

