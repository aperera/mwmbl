import {globalBus} from '../../utils/events.js';
import Sortable from 'sortablejs';

class ResultsHandler {
  constructor() {
    this.results = null;
    this.oldIndex = null;
    this.curating = false;
    this.__setup();
  }

  __setup() {
    this.__events();
    this.__initializeResults();
  }

  __events() {
    document.body.addEventListener('htmx:load', e => {
      this.__initializeResults();
    });

    // Focus first element when coming from the search bar
    globalBus.on('focus-result', () => {
      this.results.firstElementChild.firstElementChild.focus();
    });

    globalBus.on('curate-delete-result',  (e) => {
      console.log("Curate delete result event", e);
      this.__beginCurating.bind(this)();

      const children = this.results.getElementsByClassName('result');
      let deleteIndex = e.detail.data.delete_index;
      const child = children[deleteIndex];
      this.results.removeChild(child);
      const newResults = this.__getResults();

      const curationSaveEvent = new CustomEvent('save-curation', {
        detail: {
          type: 'delete',
          data: {
            timestamp: Date.now(),
            url: document.location.href,
            results: newResults,
            curation: {
              delete_index: deleteIndex
            }
          }
        }
      });
      globalBus.dispatch(curationSaveEvent);
    });

    globalBus.on('curate-validate-result',  (e) => {
      console.log("Curate validate result event", e);
      this.__beginCurating.bind(this)();

      const children = this.results.getElementsByClassName('result');
      const validateChild = children[e.detail.data.validate_index];
      validateChild.querySelector('.curate-approve').toggleValidate();

      const newResults = this.__getResults();

      const curationStartEvent = new CustomEvent('save-curation', {
        detail: {
          type: 'validate',
          data: {
            timestamp: Date.now(),
            url: document.location.href,
            results: newResults,
            curation: e.detail.data
          }
        }
      });
      globalBus.dispatch(curationStartEvent);
    });

    globalBus.on('begin-curating-results',  (e) => {
      // We might not be online, or logged in, so save the curation in local storage in case:
      console.log("Begin curation event", e);
      this.__beginCurating.bind(this)();
    });

    globalBus.on('curate-add-result', (e) => {
      console.log("Add result", e);
      this.__beginCurating();
      const resultData = e.detail;
      this.results.insertAdjacentHTML('afterbegin', resultData);

      const newResults = this.__getResults();
      const url = newResults[0].url;

      let detail = {
        type: 'add',
        data: {
          timestamp: Date.now(),
          url: document.location.href,
          results: newResults,
          curation: {
            insert_index: 0,
            url: url
          }
        }
      };
      console.log("Detail", detail);
      const curationSaveEvent = new CustomEvent('save-curation', {
        detail: detail
      });
      globalBus.dispatch(curationSaveEvent);
    });
  }

  __initializeResults() {
    this.results = document.querySelector('.results');

    if (this.results) {
      const sortable = new Sortable(this.results, {
        "onStart": this.__sortableActivate.bind(this),
        "onEnd": this.__sortableDeactivate.bind(this),
        "handle": ".handle",
      });
    }

    this.curating = false;
  }

  __sortableActivate(event) {
    console.log("Sortable activate", event);
    this.__beginCurating();
    this.oldIndex = event.oldIndex;
  }

  __beginCurating() {
    if (!this.curating) {
      const results = this.__getResults();
      const curationStartEvent = new CustomEvent('save-curation', {
        detail: {
          type: 'begin',
          data: {
            timestamp: Date.now(),
            url: document.location.href,
            results: results,
            curation: {}
          }
        }
      });
      globalBus.dispatch(curationStartEvent);
      this.curating = true;
    }
  }

  __getResults() {
    const resultsElements = document.querySelectorAll('.results .result:not(.ui-sortable-placeholder)');
    const results = [];
    for (let resultElement of resultsElements) {
      const result = {
        url: resultElement.querySelector('a').href,
        title: resultElement.querySelector('.title').innerText,
        extract: resultElement.querySelector('.extract').innerText,
        validated: resultElement.querySelector('.curate-approve').classList.contains('validated'),
        source: resultElement.querySelector('.source').innerText,
      }
      results.push(result);
    }
    console.log("Results", results);
    return results;
  }

  __sortableDeactivate(event) {
    const newIndex = event.newIndex;
    console.log('Sortable deactivate', this.oldIndex, newIndex);

    const newResults = this.__getResults();

    const curationMoveEvent = new CustomEvent('save-curation', {
      detail: {
        type: 'move',
        data: {
          timestamp: Date.now(),
          url: document.location.href,
          results: newResults,
          curation: {
            old_index: this.oldIndex,
            new_index: newIndex,
          }
        }
      }
    });
    globalBus.dispatch(curationMoveEvent);
  }
}

const resultsHandler = new ResultsHandler();
