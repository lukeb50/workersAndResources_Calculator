/* global customElements */

class ImageSelect extends HTMLElement {
    static observedAttributes = ["value"];

    mutationObserver = null;
    shadow;
    mainListElement;
    selectionDisplay;

    constructor() {
        super();
        this.value = "";
        this.tabIndex = 0;
        this.shadow = this.attachShadow({mode: "open"});
        let link = document.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('href', 'customElements/imageSelect.css');
        this.shadow.appendChild(link);
        this.selectionDisplay = createElement("span", this.shadow, "", "selection");
        let listContainer = createElement("div", this.shadow, "", "listContainer");
        this.mainListElement = createElement("span", listContainer, "", "list");
        //Handle events
        this.mutationObserver = new MutationObserver(this.handleChildrenChange);
        this.mutationObserver.observe(this, {childList: true});
        this.addEventListener("click", this.handleFocused);
        this.addEventListener("focusout", this.handleUnfocused);
        //Initial render
        this.handleChildrenChange([{addedNodes: Array.from(this.children)}]);
    }

    handleFocused() {
        let currentlyDisplayed = this.mainListElement.style.visibility === "visible";
        this.mainListElement.style.visibility = currentlyDisplayed ? "hidden" : "visible";
    }

    handleUnfocused() {
        this.mainListElement.style.visibility = "hidden";
    }

    //When value is changed programatically
    attributeChangedCallback(name, oldValue, newValue) {
        console.log("Change", oldValue, newValue);
        if (name === "value") {
            this.value = newValue;
            this.renderSelected();
        }
    }

    renderSelected() {
        clearChildren(this.selectionDisplay);
        var selectedOption = this.getOption(this.value);
        if (this.value !== "" && selectedOption !== undefined) {
            this.selectionDisplay.appendChild(selectedOption.cloneNode(true));
        }
    }

    getOption() {
        return Array.from(this.mainListElement.childNodes).find((el) => el.getAttribute("value") === this.value);
    }

    processAddedElement(el) {

    }

    handleChildrenChange = (list) => {
        //addedNodes, removedNodes
        list.forEach((entry) => {
            if (entry.addedNodes) {
                entry.addedNodes.forEach((addedNode) => {
                    if (this.includeEntryInList(addedNode)) {
                        let clone = addedNode.cloneNode(true);
                        this.mainListElement.appendChild(clone);
                        this.bindOptionClick(clone);
                        this.processAddedElement(clone);
                    }
                });
            }
            if (entry.removedNodes) {
                entry.removedNodes.forEach((removedNode) => {
                    let node = Array.from(this.mainListElement.childNodes).find((el) => el.value === removedNode.value);
                    if (node) {
                        node.remove();
                    }
                });
            }
        });
        if (this.childNodes.length === 0) {
            this.value = "";
        } else if (this.value === "") {
            this.value = this.firstElementChild.getAttribute("value");
            this.renderSelected();
        } else {//Render if value was set prior to loading options in
            this.renderSelected();
        }
    }

    includeEntryInList(entry) {
        return true;
    }

    bindOptionClick(opt) {
        opt.onclick = (() => {
            this.value = opt.getAttribute("value");
            this.renderSelected();
            this.dispatchEvent(new Event("change"));
        });
    }

    disconnectedCallback() {
        this.mutationObserver.disconnect();
    }
}

class CheckboxSelect extends ImageSelect {
    checkboxes = [];
    constructor() {
        super();
    }

    renderSelected() {
        clearChildren(this.selectionDisplay);
        let selectedOption = Array.from(this.children).find((el) => el.getAttribute("value") === "");
        this.selectionDisplay.appendChild(selectedOption.cloneNode(true));
    }

    includeEntryInList(entry) {
        return entry.getAttribute("value") !== "";
    }

    handleFocused() {
        this.mainListElement.style.visibility = "visible";
    }

    getSelected() {
        var result = [];
        this.mainListElement.childNodes.forEach((element) => {
            let elValue = element.getAttribute("value");
            if (element.querySelector("input[type=checkbox]").checked) {
                result.push(elValue);
            }
        });
        return result;
    }

    processAddedElement(el) {
        let checkBox = el.querySelector("input[type=checkbox]");
        this.checkboxUpdateListener(checkBox);
    }

    checkboxUpdateListener(box) {
        if (this.checkboxFunction) {
            box.addEventListener("change", this.checkboxFunction);
        }
    }
}

customElements.define('select-image', ImageSelect);
customElements.define('select-checkbox', CheckboxSelect);