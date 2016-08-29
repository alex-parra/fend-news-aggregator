

this.onmessage = function(e) {

  var HN_API_BASE = 'https://hacker-news.firebaseio.com';
  var HN_TOPSTORIES_URL = HN_API_BASE + '/v0/topstories.json';
  var HN_STORYDETAILS_URL = HN_API_BASE + '/v0/item/[ID].json';


  try {

    var task = e.data.task;
    var returnData = null;

    switch(task) {
      case 'getTopStories':
        httpRequest(HN_TOPSTORIES_URL, function(evt) {
          postMessage({'type': 'getTopStoriesResult', 'stories': evt.target.response});
        });
      break;

      case 'getStoryById':
        var storyId = e.data.storyId;
        var storyURL = HN_STORYDETAILS_URL.replace(/\[ID\]/, storyId);
        httpRequest(storyURL, function(evt){
          postMessage({'type': 'getStoryByIdResult', 'storyId': storyId, 'storyDetails': evt.target.response});
        });
      break;

      case 'getStoryComment':
        var commentId = e.data.commentId;
        var storyCommentURL = HN_STORYDETAILS_URL.replace(/\[ID\]/, commentId);
        httpRequest(storyCommentURL, function(evt) {
          postMessage({'type': 'getStoryCommentResult', 'commentId': commentId, 'commentDetails': evt.target.response});
        });
      break;

      default:
        returnData = 'invalid task';
    }

    postMessage(returnData);

  } catch (e) {

    postMessage(undefined);
  }
}


  function httpRequest(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = callback;
    xhr.send();
  }
