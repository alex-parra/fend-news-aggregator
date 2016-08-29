var APP = APP || {};

APP.Main = (function() {
  
  var LAZY_LOAD_THRESHOLD = 300;
  var $ = document.querySelector.bind(document);

  var stories = null;
  var storyStart = 0;
  var storiesBatch = 100;
  var storyLoadCount = 0;

  var $main = $('main');
  var inDetails = false;

  var localeData = {
    data: {
      intl: {
        locales: 'en-US'
      }
    }
  };

  var tmplStory = $('#tmpl-story').textContent;
  var tmplStoryDetails = $('#tmpl-story-details').textContent;
  var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
  } else {
    // Remove references to formatRelative, because Intl isn't supported.
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
    tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
  }

  var storyTemplate = Handlebars.compile(tmplStory);
  var storyDetailsTemplate = Handlebars.compile(tmplStoryDetails);
  var storyDetailsCommentTemplate = Handlebars.compile(tmplStoryDetailsComment);


// APP INIT

  var worker = new Worker('js/worker.js');

  worker.addEventListener('message', function(e){

    if( e.data === null ) return;

    switch( e.data.type ) {
      case 'getTopStoriesResult':
        stories = e.data.stories; // getTopStories returns a list of story IDs only. No details per story.
        $main.classList.remove('loading');
        requestAnimationFrame(loadStoryBatch);
      break;
      
      case 'getStoryByIdResult':
        onStoryData.call(this, e.data.storyId, e.data.storyDetails);
      break;
      
      case 'getStoryCommentResult':
        var commentDetails = e.data.commentDetails;
        commentDetails.time *= 1000;
        var comment = $('#storyDetailView').querySelector('#sdc-' + commentDetails.id);
        comment.innerHTML = storyDetailsCommentTemplate(commentDetails, localeData);
      break;
    }

  });

  // Init: Fetch the Top Stories List
  worker.postMessage({'task': 'getTopStories'});



// APP FUNCTIONS

  $main.addEventListener('scroll', function(){
    var header = $('header');
    var headerTitles = header.querySelector('.header__title-wrapper');
    var scrollTopCapped = Math.min(70, $main.scrollTop);
    var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';

    header.style.height = (156 - scrollTopCapped) + 'px';
    headerTitles.style.webkitTransform = scaleString;
    headerTitles.style.transform = scaleString;

    // Add a shadow to the header.
    if( $main.scrollTop > 70 )
      document.body.classList.add('raised');
    else
      document.body.classList.remove('raised');


    // Check if we need to load the next batch of stories.
    var loadThreshold = ($main.scrollHeight - $main.offsetHeight - LAZY_LOAD_THRESHOLD);
    if( $main.scrollTop > loadThreshold ) loadStoryBatch();
  });


  function loadStoryBatch() {
    if (storyLoadCount > 0) return;

    storyLoadCount = storiesBatch;

    var end = storyStart + storiesBatch;

    for( var i = storyStart; i < end; i++ ) {

      if( i >= stories.length ) return;

      var key = String(stories[i]);
      var story = document.createElement('div');
      story.setAttribute('id', 's-' + key);
      story.classList.add('story');
      story.innerHTML = storyTemplate({
        title: '...',
        score: '-',
        by: '...',
        time: 0
      });
      $main.appendChild(story);

      worker.postMessage({'task':'getStoryById', 'storyId': key});
    }

    storyStart += storiesBatch;

    requestAnimationFrame(loadStoryBatch);
  }


  function onStoryData(key, details) {
    var story = $('#s-' + key);
    details.time *= 1000;
    var html = storyTemplate(details);
    story.innerHTML = html;
    story.addEventListener('click', onStoryClick.bind(this, details));
    story.classList.add('clickable');

    // Tick down. When zero we can batch in the next load.
    storyLoadCount--;
  }

  function onStoryClick(storyDetails) {
    var storyDetailsView = $('#storyDetailView');

    if( !storyDetailsView ) {
      storyDetailsView = document.createElement('section');
      storyDetailsView.setAttribute('id', 'storyDetailView');
      storyDetailsView.classList.add('story-details');
      document.body.appendChild(storyDetailsView);
    }

    if (storyDetails.url) storyDetails.urlobj = new URL(storyDetails.url);

    var comment;
    var commentsElement;
    var storyHeader;
    var storyContent;

    var storyDetailsHtml = storyDetailsTemplate(storyDetails);
    var kids = storyDetails.kids;
    var commentHtml = storyDetailsCommentTemplate({
      by: '', text: 'Loading comment...'
    });


    storyDetailsView.innerHTML = storyDetailsHtml;

    commentsElement = storyDetailsView.querySelector('.js-comments');
    storyHeader = storyDetailsView.querySelector('.js-header');
    storyContent = storyDetailsView.querySelector('.js-content');

    var closeButton = storyDetailsView.querySelector('.js-close');
    closeButton.addEventListener('click', function(){
      $('#storyDetailView').classList.remove('open');
    });

    var headerHeight = storyHeader.getBoundingClientRect().height;
    storyContent.style.paddingTop = headerHeight + 'px';


    // Show the View Pane
    storyDetailsView.classList.add('open');


    if( typeof kids !== 'undefined' ) {
      for (var k = 0; k < kids.length; k++) {
        comment = document.createElement('aside');
        comment.setAttribute('id', 'sdc-' + kids[k]);
        comment.classList.add('story-details__comment');
        comment.innerHTML = commentHtml;
        commentsElement.appendChild(comment);

        // Update the comment with the live data.
        worker.postMessage({'task': 'getStoryComment', 'commentId': kids[k]});
      }
    }



  }


})(); // App.Main