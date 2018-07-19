import React from 'react';
import { Editor, EditorState, RichUtils, Modifier, convertToRaw, convertFromRaw } from 'draft-js';
import { HuePicker } from 'react-color';
// import 'draft-js/dist/Draft.css';
import axios from 'axios';
import Button from './Button';
import _ from 'underscore';

const blockStyles = [
  { style: 'header-one', title: 'H1' },
  { style: 'header-two', title: 'H2' },
  { style: 'header-three', title: 'H3' },
  { style: 'header-four', title: 'H4' },
  { style: 'header-five', title: 'H5' },
  { style: 'header-six', title: 'H6' },
  { style: 'blockquote', title: 'Quote' },
  { style: 'text-align-left', title: 'Left' },
  { style: 'text-align-center', title: 'Center' },
  { style: 'text-align-right', title: 'Right' },
  { style: 'ordered-list-item', title: 'Numbered List' },
  { style: 'unordered-list-item', title: 'Bullet Points' },

];

function getBlockStyle(block) {
  const type = block.getType();
  return (type.indexOf('text-align-') === 0) ? type : null;
}

export default class TextBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: EditorState.createEmpty(),
      color: '#fff',
      fontInput: 0,
      styleMap: {},
      interval: '',
      autoSave: false,
      search: '',
      pending: false
    };
  }

  componentDidMount() {
    const socket = this.props.socket;
    // open document and start listening for changes to the document
    socket.emit('openDocument', {
      docId: this.props.docId
    }, (res) => {
      if (res.err) {
        console.log("res.err", res.err);
        return alert("error");
      } else {
        console.log("success with openDocument", res);
        // // save response to this.state
        // this.setState({
        //   doc: res.doc
        // })
        console.log("res.doc", res.doc);
        console.log("res.doc.rawState:", res.doc.rawState);
        // if there is rawState, set current editorState to rawState
        res.doc.rawState && this.setState({
          editorState: EditorState.createWithContent(convertFromRaw(res.doc.rawState)),
          styleMap: JSON.parse(res.doc.rawStyle)
        });
        // start watching the document to sync live edits
        socket.on('syncDocument',this.remoteStateChange)
      }
    })




    // save document every 30 seconds
    let intervalId = setInterval(() => this.save(), 30000);
    if (this.props.content) {
      const text = convertFromRaw(JSON.parse(this.props.content))
      const styles = JSON.parse(this.props.styles)
      this.setState({
        editorState: EditorState.createWithContent(text),
        styleMap: styles,
      });
    }
    this.setState({
      interval: intervalId,
    });
  }

  // track what the user is changing
  onChange = (editorState) => {
    console.log('this.state.pending', this.state.pending)
    const socket = this.props.socket;
    // if (!this.state.pending) {
      this.setState({
        editorState,
        pending: true
      }, () => {
        this.props.socket.emit('syncDocument', {
          docId: this.props.docId,
          rawState: convertToRaw(editorState.getCurrentContent()),
          rawStyle: JSON.stringify(this.state.styleMap) 
        });
      })
    // }
  }

  // sync remote document edits to our editor
  remoteStateChange = (res) => {
    console.log("res", res);
    let update = EditorState.createWithContent(convertFromRaw(res.rawState))
    let update2 = EditorState.forceSelection(update, this.state.editorState.getSelection())

    this.setState({
      editorState: update2,
      styleMap: JSON.parse(res.rawStyle),
      pending: false
    });
  }

  componentWillUnmount() {
    const socket = this.props.socket;
    // stop saving document
    clearInterval(this.state.interval);
    // clear up listeners
    socket.off('syncDocument');
    socket.emit('closeDocument', {
      docId: this.props.docId
    })
  }

  inline(inline) {
    this.onChange(RichUtils.toggleInlineStyle(
      this.state.editorState,
      inline,
    ));
  }

  toggleColor(color) {
    
    let state = this.state.editorState;

    let set = state.getCurrentInlineStyle();
    for (let item of set.keys()) {
      if (item[0] === '#') {
        // remove this color
        console.log("removing item", item);
        state = RichUtils.toggleInlineStyle(state, item)
      }
    }
    // apply new color
    state = RichUtils.toggleInlineStyle(state, color)

    // let inlineStyle = new RegExp("^#");
    // // remove all "#colorhere" from current editorState
    // let updated = Modifier.removeInlineStyle(state.getCurrentContent(), state.getSelection(), inlineStyle);
    // // create a new editorState based on new state
    // let newEditorState = EditorState.createWithContent(updated)
    // // keep the old selection state
    // let keepOld = EditorState.forceSelection(newEditorState, state.getSelection());
    this.onChange(state);
    
    
    
  }

  block(block) {
    this.onChange(RichUtils.toggleBlockType(
      this.state.editorState,
      block,
    ));
  }

  clear() {
    const { editorState } = this.state;
    const selection = editorState.getSelection();
    this.state.styleMap.BOLD = '';
    this.state.styleMap.UNDERLINE = '';
    this.state.styleMap.ITALIC = '';
    this.state.styleMap.CODE = '';
    const clearContentState = Object.keys(this.state.styleMap)
            .reduce(
              (contentState, style) => Modifier.removeInlineStyle(contentState, selection, style),
              editorState.getCurrentContent(),
          );
    delete this.state.styleMap.BOLD;
    delete this.state.styleMap.UNDERLINE;
    delete this.state.styleMap.ITALIC;
    delete this.state.styleMap.CODE;
    const newEditorState = EditorState.push(
            editorState,
            clearContentState,
            'change-inline-style',
          );
    const newUnstyledEditorState = RichUtils.toggleBlockType(
      newEditorState,
      'unstyled',
    );

    this.onChange(newUnstyledEditorState);
  }

  save() {
    this.setState({
      autoSave: true,
    });
    const { editorState } = this.state;
    const raw = convertToRaw(editorState.getCurrentContent());
    _.each(raw.blocks, (block) => {
      block.inlineStyleRanges = block.inlineStyleRanges.filter(style => (
        style.style !== 'highlighted'
      ));
    });
    axios.post(`http://localhost:1337/saveContent/${this.props.docId}`, {
      content: JSON.stringify(raw),
      style: JSON.stringify(this.state.styleMap),
    })
    .then((resp) => {
      if (resp.status === 200) {
        console.log('Saved');
        setTimeout(() => this.setState({
          autoSave: false,
        }), 1000);
      }
    })
    .catch((err) => {
      console.log('Error: ', err);
    });
  }

  search(search) {
    this.state.styleMap.highlighted = { backgroundColor: 'yellow' };
    const { editorState } = this.state;
    const raw = convertToRaw(editorState.getCurrentContent());
    _.each(raw.blocks, (block) => {
      const sLen = search.length;
      for (let i = 0; i < block.text.length; i ++) {
        if (block.text.substr(i, sLen) === search) {
          let checked = false;
          for (let j = 0; j < block.inlineStyleRanges.length; j++) {
            if (block.inlineStyleRanges[j].style === 'highlighted' &&
             block.inlineStyleRanges[j].offset === i) {
              block.inlineStyleRanges[j] = {
                offset: i,
                length: sLen,
                style: 'highlighted',
              };
              checked = true;
            }
          }
          if (!checked) {
            block.inlineStyleRanges.push({
              offset: i,
              length: sLen,
              style: 'highlighted',
            });
          }
        } else {
          block.inlineStyleRanges = block.inlineStyleRanges.filter(style =>
                (!(style.offset === i && style.style === 'highlighted')));
        }
      }
    });

    const cooked = convertFromRaw(raw);
    this.setState({
      editorState: EditorState.createWithContent(cooked),
      search,
    });
    // console.log(raw);
  }

  

  render() {
    return (
      <div id="textBox">
        <div id="textOptions">
          <input
            type="string"
            value={this.state.search}
            placeholder="Search"
            onChange={(e) => { this.search(e.target.value); }}
          /> <br />
          {blockStyles.map(({ style, title }) =>
          (<button key={title} onClick={() => { this.block(style); }}>{title}</button>))}
          <br />
          <button onClick={() => { this.inline('BOLD'); }}><b>B</b></button>
          <button onClick={() => { this.inline('ITALIC'); }}><i>I</i></button>
          <button onClick={() => { this.inline('UNDERLINE'); }}><u>U</u></button>
          <button onClick={() => {
            this.inline('CODE'); this.block('code-block');
          }}
          >Code</button>
          <button onClick={() => { 
            this.clear();
          }}
          >Default</button>
          <input
            ref={input => { this.fontSelect = input }}
            onClick={() => {this.fontSelect.focus()}}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                this.state.styleMap[String(e.target.value)] = { fontSize: e.target.value };
                this.inline(String(e.target.value));
              }
            }
                  }
            onChange={(e) => {
              this.setState({ fontInput: e.target.value });
            }}
            type="number"
            value={this.state.fontInput}
          />
          <HuePicker
            color={this.state.color}
            onChangeComplete={(color) => {
              this.state.styleMap[String(color.hex)] = { color: color.hex };
              this.setState({ color: color.hex });
              this.toggleColor((String(color.hex))); 
            }}
          />
        </div> 
        <div className="editor">
          <Editor
            blockStyleFn={getBlockStyle}
            customStyleMap={this.state.styleMap}
            editorState={this.state.editorState}
            onChange={this.onChange}
          />
        </div>
        {(this.state.autoSave)?<p>Saving...</p>:<p></p>}
        <Button type="Save" onClick={()=>this.save()}/>
      </div>
    );
  }
}