import {html, PolymerElement} from '@polymer/polymer/polymer-element.js';
import {TypieRowItem} from "typie-sdk";
import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';

class TypieSearch extends PolymerElement {

    static get template() {
        return html`
        <div id="app" class$="[[isLoading]]">
            <div class="icon"></div>
            <div class="search">
                <template id="pkgList" is="dom-repeat" items="[[pkgList]]" as="pkg">
                    <span class="prefix">[[pkg]]</span>
                    <span class="arrow">&#9658;</span>
                </template>
                <div class="loading">
                    <div class="spinner">
                        <div class="rect1"></div>
                        <div class="rect2"></div>
                        <div class="rect3"></div>
                        <div class="rect4"></div>
                        <div class="rect5"></div>
                    </div>
                    [[loadingTitle]]
                </div>
                <input autofocus id="inputField" type="text" placeholder=""/>
                <div class="close" on-click="handleCloseClick">x</div>
            </div>
            <ul class="results">
                <template id="resultList" is="dom-repeat" items="[[itemList]]" as="item">
                    <li on-click="handleClickItem" class$="[[item.selected]]">
                        <img src="[[item.i]]">
                        <div class="texts">
                            <span inner-h-t-m-l="[[item.titleHighLight]]"></span>
                            <template is="dom-repeat" items="[[item.l]]" as="label">
                                <span class$="label [[label.style]]">[[ label.text ]]</span>
                            </template>
                            <p class$="selectedAction animated [[item.actionFlip]]" hidden$="[[hideAction(item.a)]]">[[ item.a.0.description ]]</p>
                            <p hidden$="[[hideDesc(item.d, item.a)]]">[[item.d]]</p>
                            <p hidden$="[[hidePath(item.d, item.a)]]">[[item.p]]</p>
                        </div>
                        <div class="score">
                            <span hidden$="[[hideScore(item.score)]]">[[item.score]]</span>
                            <span hidden$="[[hideScore(item.c)]]"> + [[item.c]]</span>
                        </div>
                    </li>
                </template>
            </ul>
            <div class="footer">
                <div class="search-time">
                    <span>[[searchTime]]</span>
                    <span hidden$="[[isEmpty(resultMsg)]]"> | [[resultMsg]]</span>
                </div>
                
                <div class="handle">· · · ·</div>
                <div class="status">Typie {%VERSION%}</div>
                <!--<div class="status">[[totalItems]] items in Catalog · Typie {%VERSION%}</div>-->
            </div>
        </div>
        `;
    }

    static get properties() {
        return {
            selectedIndex: {
                type: Number,
                observer: '_indexChange'
            },
            selectedItem: Object,
            pkgList: Array,
            itemList: Array,
            jsonList: String,
            searchTime: String,
            totalItems: Number,

            isLoading: String,
            loadingTitle: String,
            resultMsg: String,
        }
    }

    constructor() {
        super();
        this.pkgList = [];
        this.input = null;
        this.searchTimer = null;
        this.resultMsgTimer = null;
        this.clearResultMsg();
    }

    connectedCallback() {
        super.connectedCallback();
        this.input = this.shadowRoot.getElementById("inputField");
        this.input.addEventListener('input', () => this.inputChange());
        this.input.addEventListener('keydown', e => this.keyDown(e));
        // this.shadowRoot.addEventListener("dom-change", (e) => {
        //     this.setHeight();
        // });
    }

    isEmpty(variable) {
        return !variable || variable === "" || variable === 0;
    }

    hideScore(score) {
        return !score || score === 0;
    }

    hideAction(actions) {
        return !actions;
    }

    hideDesc(description, actions) {
        return actions || !description || description === "";
    }

    hidePath(desc, actions) {
        return desc || actions;
    }

    handleClickItem(e) {
        const li = e.target.closest('li');
        const nodes = Array.from(li.closest('ul').children);
        this.selectedIndex = nodes.indexOf(li);
        this.onEnter(e);
    }

    handleCloseClick(e) {
        console.log(e);
        this.onEscape(e);
    }

    keyDown(e) {
        switch (e.code) {
            case "Tab":
                this.onTab(e);
                break;
            case "Enter":
                this.onEnter(e);
                break;
            case "ArrowUp":
                this.onArrowUp(e);
                break;
            case "ArrowDown":
                this.onArrowDown(e);
                break;
            case "ArrowRight":
                this.onArrowRight();
                break;
            case "Backspace":
                this.onBackspace(e);
                break;
            case "Delete":
                this.onDelete(e);
                break;
            case "Escape":
                this.onEscape(e);
                break;
        }
    }

    onTab(e) {
        e.preventDefault();
        if (this.isPackageSelected()) {
            this.setPackageList(false);
        } else {
            this.input.value = this.getItem().title;
        }
    }

    onEnter(e) {
        e.preventDefault();
        if (this.isPackageSelected()) {
            this.setPackageList(true);
        } else {
            this.sendActivate();
        }
    }

    setPackageList(countUp) {
        if (this.isPackageSelected()) {
            let item = this.getItem();
            let pkgList = JSON.parse(JSON.stringify(this.pkgList));
            if (item.p.startsWith('SubPackage|')) {
                pkgList = [];
                let pksArr = item.p.slice(11).split('->');
                for (let pk of pksArr) {
                    pkgList.push(pk);
                }
            } else {
                pkgList.push(item.title);
            }
            this.set('pkgList', pkgList);
            console.log('pkgList', pkgList);
            this.sendEnterPkg(countUp);
            this.clearAll();
        }
    }

    onArrowUp(e) {
        e.preventDefault();
        if (this.selectedIndex > 0) {
            this.set('selectedIndex', this.selectedIndex - 1);
        } else if (this.selectedIndex === 0) {
            this.set('selectedIndex', this.itemList.length - 1);
        }
    }

    onArrowDown(e) {
        e.preventDefault();
        if (this.selectedIndex < this.itemList.length - 1) {
            this.set('selectedIndex', this.selectedIndex + 1);
        } else if (this.selectedIndex === this.itemList.length - 1) {
            this.set('selectedIndex', 0);
        }
    }

    onArrowRight(e) {
        const item = this.getItem();
        if (item && item.a && item.a.length > 1 && this.isCaretAtEnd()) {
            let tmp = JSON.parse(this.jsonList);
            let a = tmp[this.selectedIndex].a.shift();
            tmp[this.selectedIndex].a.push(a);
            // const animateArr = ["slideInUp", "slideInLeft", "zoomInUp", "zoomInRight", "zoomInLeft", "flipInX", "fadeInRightBig", "fadeInLeft", "bounceInUp", "bounceInLeft"];
            // tmp[this.selectedIndex].actionFlip = animateArr[Math.floor(Math.random() * animateArr.length)];
            if (tmp[this.selectedIndex].actionFlip === "bounceIn2") {
                tmp[this.selectedIndex].actionFlip = "bounceIn";
            } else {
                tmp[this.selectedIndex].actionFlip = "bounceIn2";
            }
            this.jsonList = JSON.stringify(tmp);
            tmp[this.selectedIndex].selected = "selected";
            this.set('itemList', tmp);
        }
    }

    onBackspace(e) {
        if (this.input.value.length === 0) {
            if (this.pkgList.length > 1) {
                console.log('pkglist', this.pkgList);
                const pkgList = this.pkgList.slice(0, -1);
                this.set('pkgList', pkgList);
                this.sendClear();
            } else {
                this.set('pkgList', []);
            }
            this.clearList();
        }
    }

    onDelete(e) {
        const item = this.getItem();
        if (item && this.isCaretAtEnd()) {
            this.sendDelete();
        }
    }

    onEscape(e) {
        e.preventDefault();
        this.sendEscape();
        this.set('pkgList', []);
        this.clearAll();
    }

    inputChange() {
        this.resetTimer();
        if (this.input.value.length > 0) {
            this.sendSearch();
        } else if (this.pkgList.length > 0) {
            this.sendClear();
        } else {
            this.clearList();
        }
    }

    changePackage(data) {
        if (data && data.length > 0) {
            let pkgList = JSON.stringify(this.pkgList);
            let newPkgList = JSON.stringify(data);
            if (pkgList !== newPkgList) {
                pkgList = JSON.parse(newPkgList);
                this.set('pkgList', pkgList);
                console.log('pkgList', pkgList);
                this.clearAll();
                this.sendEnterPkg();
                this.focus();
            }
        } else {
            this.set('pkgList', []);
            this.clearAll();
            this.focus();
        }
    }

    updateList(data) {
        // console.log('updateList', data);
        this.clearLoading();
        if (data && data.data && data.data.length > 0) {
            data.data = data.data.map((o) => {
                let i;
                o.titleHighLight = o.title;
                if (o.idxs && o.idxs.length > 0) {
                    for (i of o.idxs.reverse()) {
                        let tmp = o.titleHighLight.split('');
                        tmp.splice(i+1, 0, "|TBE|");
                        tmp.splice(i, 0, "|TB|");
                        o.titleHighLight = tmp.join('');
                    }
                    o.titleHighLight = this.escapeHtml(o.titleHighLight);
                    o.titleHighLight = o.titleHighLight.replace(/\|TB\|/g, "<b>");
                    o.titleHighLight = o.titleHighLight.replace(/\|TBE\|/g, "</b>");
                } else {
                    o.titleHighLight = this.escapeHtml(o.title);
                }
                return o;
            });
            this.set('itemList', data.data);
            this.set('jsonList', JSON.stringify(data.data));
            this.set('selectedIndex', -1);
            this.set('totalItems', data.total);
            this.set('selectedIndex', 0);
        } else {
            this.clearList();
        }
        this.set('searchTime', (Date.now() - this.searchTimer) + " ms");
    }

    deleteItem(item) {
        if (item) {
            let tmp = JSON.parse(this.jsonList);
            for (let key in tmp) {
                if (tmp[key].title === item.title && tmp[key].t === item.t && tmp[key].p === item.p) {
                    console.info("removing: " + item.title);
                    tmp.splice(key, 1);
                    this.updateList({data: tmp, length: tmp.length, err: 0});
                    return;
                }
            }
        }
    }

    listLoading(string) {
        this.clearList();
        this.set('isLoading', "isLoading");
        this.set('loadingTitle', string);
    }

    setResultMsg(string) {
        this.set('resultMsg', string);
        if (this.resultMsgTimer) {
            this.resultMsgTimer = null;
        }
        this.resultMsgTimer = setTimeout(() => {
            this.clearResultMsg();
        }, 7000);
    }

    _indexChange() {
        // console.log('active change');
        if (this.jsonList && this.selectedIndex >= 0) {
            let tmp = JSON.parse(this.jsonList);
            tmp[this.selectedIndex].selected = "selected";
            this.set('itemList', tmp);
        }
    }

    sendActivate() {
        this.resetTimer();
        this.dispatchEvent(new CustomEvent('activate', {
            detail: {
                item: this.getItem(),
                pkgList: this.pkgList,
            }
        }));
    }

    sendEnterPkg(countUp = false) {
        this.resetTimer();
        this.dispatchEvent(new CustomEvent('enterPkg', {
            detail: {
                countUp: countUp,
                item: this.getItem(),
                pkgList: this.pkgList,
            }
        }));
    }

    sendClear() {
        this.resetTimer();
        this.dispatchEvent(new CustomEvent('clear', {
            detail: {
                pkgList: this.pkgList,
            }
        }));
    }

    sendSearch() {
        this.resetTimer();
        this.dispatchEvent(new CustomEvent('search', {
            detail: {
                value: this.input.value,
                pkgList: this.pkgList,
            }
        }));
    }

    sendDelete() {
        this.resetTimer();
        this.dispatchEvent(new CustomEvent('delete', {
            detail: {
                item: this.getItem(),
                pkgList: this.pkgList,
            }
        }));
    }

    sendEscape() {
        this.dispatchEvent(new CustomEvent('escape', {detail: null}));
    }


    clearAll() {
        this.clearValue();
        this.clearList();
    }

    clearValue() {
        this.input.value = "";
    }

    clearList() {
        this.clearLoading();
        this.set('jsonList', "");
        this.set('itemList', []);
        this.set('selectedIndex', -1);
        this.set('searchTime', "");
    }

    clearLoading() {
        this.set('isLoading', "");
        this.set('loadingTitle', "");
        this.focus();
    }

    clearResultMsg() {
        this.set('resultMsg', "");
    }

    focus() {
        // console.log('do focus');
        this.input.focus();
    }

    isCaretAtEnd() {
        return this.input.selectionStart === this.input.value.length;
    }

    removeStyles() {
        let styles = this.shadowRoot.querySelectorAll('style');
        for (let i in styles) {
            if (styles[i] instanceof Node) {
                this.shadowRoot.removeChild(styles[i]);
            }
        }
    }

    loadStyles(cssString) {
        this.removeStyles();
        console.info('Loading styles...');
        let style = document.createElement('style');
        style.appendChild(document.createTextNode(cssString));
        this.shadowRoot.appendChild(style);
        // this.shadowRoot.addEventListener("dom-change", (e) => {
        //     this.setHeight();
        // });
    }

    disconnectedCallback() {
        this.input.removeEventListener('input', () => this.change());
        this.input.removeEventListener('keydown', e => this.keyDown(e));
    }

    isPackageSelected() {
        return TypieRowItem.isPackage(this.getItem());
    }

    getItem() {
        return this.itemList[this.selectedIndex];
    }

    resetTimer() {
        this.searchTimer = Date.now();
    }

    setHeight() {
        const height = this.shadowRoot.getElementById("app").offsetHeight;
        this.dispatchEvent(new CustomEvent('setHeight', {
            detail: height
        }));
    }

    escapeHtml(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag));
    }
}
customElements.define('typie-search', TypieSearch);
