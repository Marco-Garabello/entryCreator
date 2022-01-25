
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.46.2 */

    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let form;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let br0;
    	let t5;
    	let label1;
    	let t7;
    	let input1;
    	let t8;
    	let br1;
    	let t9;
    	let label2;
    	let t11;
    	let input2;
    	let t12;
    	let br2;
    	let t13;
    	let label3;
    	let t15;
    	let input3;
    	let t16;
    	let br3;
    	let t17;
    	let button;
    	let t19;
    	let div1;
    	let textarea;
    	let textarea_value_value;
    	let div1_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Entry Application";
    			t1 = space();
    			div0 = element("div");
    			form = element("form");
    			label0 = element("label");
    			label0.textContent = "Name:";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			br0 = element("br");
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Comment:";
    			t7 = space();
    			input1 = element("input");
    			t8 = space();
    			br1 = element("br");
    			t9 = space();
    			label2 = element("label");
    			label2.textContent = "Path:";
    			t11 = space();
    			input2 = element("input");
    			t12 = space();
    			br2 = element("br");
    			t13 = space();
    			label3 = element("label");
    			label3.textContent = "Icon:";
    			t15 = space();
    			input3 = element("input");
    			t16 = space();
    			br3 = element("br");
    			t17 = space();
    			button = element("button");
    			button.textContent = "Show result";
    			t19 = space();
    			div1 = element("div");
    			textarea = element("textarea");
    			attr_dev(h1, "class", "svelte-1aqz9v");
    			add_location(h1, file, 10, 1, 136);
    			attr_dev(label0, "class", "inline svelte-1aqz9v");
    			attr_dev(label0, "for", "idName");
    			add_location(label0, file, 14, 12, 201);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "idName");
    			attr_dev(input0, "name", "name");
    			attr_dev(input0, "placeholder", "write app name");
    			attr_dev(input0, "size", "21");
    			add_location(input0, file, 15, 12, 263);
    			add_location(br0, file, 16, 12, 376);
    			attr_dev(label1, "class", "inline svelte-1aqz9v");
    			attr_dev(label1, "for", "idComment");
    			add_location(label1, file, 18, 12, 398);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "id", "idComment");
    			attr_dev(input1, "name", "comment");
    			attr_dev(input1, "placeholder", "write a comment");
    			attr_dev(input1, "size", "18");
    			add_location(input1, file, 19, 12, 466);
    			add_location(br1, file, 20, 12, 586);
    			attr_dev(label2, "class", "inline svelte-1aqz9v");
    			attr_dev(label2, "for", "idPath");
    			add_location(label2, file, 22, 12, 608);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "id", "idPath");
    			attr_dev(input2, "name", "path");
    			attr_dev(input2, "placeholder", "write the path to the executable");
    			attr_dev(input2, "size", "22");
    			add_location(input2, file, 23, 12, 670);
    			add_location(br2, file, 24, 12, 804);
    			attr_dev(label3, "class", "inline svelte-1aqz9v");
    			attr_dev(label3, "for", "idIcon");
    			add_location(label3, file, 26, 12, 826);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "id", "idIcon");
    			attr_dev(input3, "name", "icon");
    			attr_dev(input3, "placeholder", "write the path to the icon");
    			attr_dev(input3, "size", "22");
    			add_location(input3, file, 27, 12, 888);
    			add_location(br3, file, 29, 12, 1018);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "name", "Show");
    			attr_dev(button, "id", "idShow");
    			add_location(button, file, 30, 12, 1035);
    			add_location(form, file, 13, 8, 182);
    			add_location(div0, file, 12, 4, 168);
    			attr_dev(textarea, "name", "result");
    			attr_dev(textarea, "id", "idResult");
    			attr_dev(textarea, "cols", "30");
    			attr_dev(textarea, "rows", "10");
    			textarea.value = textarea_value_value = "\n                Name=" + /*name*/ ctx[0] + "\n                Comment=" + /*comment*/ ctx[2] + "\n                Exec=" + /*path*/ ctx[1] + "\n                Terminal=false\n                Type=Application\n                Icon=" + /*icon*/ ctx[3] + "\n                NoDisplay=false\n            ";
    			add_location(textarea, file, 37, 12, 1314);

    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(/*enableHide*/ ctx[4] && /*name*/ ctx[0] != "" && /*path*/ ctx[1] != "" && /*comment*/ ctx[2] != "" && /*icon*/ ctx[3] != ""
    			? ''
    			: 'hide') + " svelte-1aqz9v"));

    			attr_dev(div1, "id", "idResponse");
    			add_location(div1, file, 35, 4, 1182);
    			attr_dev(main, "class", "svelte-1aqz9v");
    			add_location(main, file, 9, 0, 128);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			append_dev(div0, form);
    			append_dev(form, label0);
    			append_dev(form, t3);
    			append_dev(form, input0);
    			set_input_value(input0, /*name*/ ctx[0]);
    			append_dev(form, t4);
    			append_dev(form, br0);
    			append_dev(form, t5);
    			append_dev(form, label1);
    			append_dev(form, t7);
    			append_dev(form, input1);
    			set_input_value(input1, /*path*/ ctx[1]);
    			append_dev(form, t8);
    			append_dev(form, br1);
    			append_dev(form, t9);
    			append_dev(form, label2);
    			append_dev(form, t11);
    			append_dev(form, input2);
    			set_input_value(input2, /*comment*/ ctx[2]);
    			append_dev(form, t12);
    			append_dev(form, br2);
    			append_dev(form, t13);
    			append_dev(form, label3);
    			append_dev(form, t15);
    			append_dev(form, input3);
    			set_input_value(input3, /*icon*/ ctx[3]);
    			append_dev(form, t16);
    			append_dev(form, br3);
    			append_dev(form, t17);
    			append_dev(form, button);
    			append_dev(main, t19);
    			append_dev(main, div1);
    			append_dev(div1, textarea);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[7]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[8]),
    					listen_dev(button, "click", /*click_handler*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && input0.value !== /*name*/ ctx[0]) {
    				set_input_value(input0, /*name*/ ctx[0]);
    			}

    			if (dirty & /*path*/ 2 && input1.value !== /*path*/ ctx[1]) {
    				set_input_value(input1, /*path*/ ctx[1]);
    			}

    			if (dirty & /*comment*/ 4 && input2.value !== /*comment*/ ctx[2]) {
    				set_input_value(input2, /*comment*/ ctx[2]);
    			}

    			if (dirty & /*icon*/ 8 && input3.value !== /*icon*/ ctx[3]) {
    				set_input_value(input3, /*icon*/ ctx[3]);
    			}

    			if (dirty & /*name, comment, path, icon*/ 15 && textarea_value_value !== (textarea_value_value = "\n                Name=" + /*name*/ ctx[0] + "\n                Comment=" + /*comment*/ ctx[2] + "\n                Exec=" + /*path*/ ctx[1] + "\n                Terminal=false\n                Type=Application\n                Icon=" + /*icon*/ ctx[3] + "\n                NoDisplay=false\n            ")) {
    				prop_dev(textarea, "value", textarea_value_value);
    			}

    			if (dirty & /*enableHide, name, path, comment, icon*/ 31 && div1_class_value !== (div1_class_value = "" + (null_to_empty(/*enableHide*/ ctx[4] && /*name*/ ctx[0] != "" && /*path*/ ctx[1] != "" && /*comment*/ ctx[2] != "" && /*icon*/ ctx[3] != ""
    			? ''
    			: 'hide') + " svelte-1aqz9v"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let name = "";
    	let path = "";
    	let comment = "";
    	let icon = "";
    	let enableHide = false;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function input1_input_handler() {
    		path = this.value;
    		$$invalidate(1, path);
    	}

    	function input2_input_handler() {
    		comment = this.value;
    		$$invalidate(2, comment);
    	}

    	function input3_input_handler() {
    		icon = this.value;
    		$$invalidate(3, icon);
    	}

    	const click_handler = () => $$invalidate(4, enableHide = !enableHide);
    	$$self.$capture_state = () => ({ name, path, comment, icon, enableHide });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('path' in $$props) $$invalidate(1, path = $$props.path);
    		if ('comment' in $$props) $$invalidate(2, comment = $$props.comment);
    		if ('icon' in $$props) $$invalidate(3, icon = $$props.icon);
    		if ('enableHide' in $$props) $$invalidate(4, enableHide = $$props.enableHide);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		path,
    		comment,
    		icon,
    		enableHide,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		click_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
