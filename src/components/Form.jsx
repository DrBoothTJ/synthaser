import { useState } from 'react'
import { DomainList } from './domains/List'
import { RuleList } from './rules/List'
import { RuleTree } from './Tree'
import { v4 as uuidv4 } from 'uuid'


/**
 * Generates hierarchicy of rules based on parent/child relationships.
 *
 * Looks for children of a rule (uuid parameter), then returns copies
 * of those children, recursing for their children, if any.
 * 
 * @prop {Array} rules - rule objects
 * @prop {String} uuid - UUID of a parent rule
 */
const nest = (rules, uuid = null) => rules
  .filter(rule => rule.parent === uuid)
  .map(rule => ({
    ...rule,
    children: nest(rules.filter(r => r !== rule), rule.uuid)
  }))

/**
 * Creates new Blob object containing serialised ruleset.
 */
function makeBlob(text) {
  return new Blob([text], {type: "text/json"})
}

/**
 * Prompts user download of a Blob object given some filename.
 */
function download(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * The main synthaser rule generator form.
 */
export const Form = () => {
  const [state, setState] = useState({
    domains: [],
    rules: [],
  })

  /**
   * Prepends a new domain object to the domain array in state.
   *
   * Each new domain has the following properties:
   * @prop {String} uuid - Unique identifier string generated by uuidv4
   * @prop {String} name - Name of domain type
   * @prop {Array} domains - Domain families of this domain type
   */
  const handleAddDomain = () => {
    setState({
      ...state,
      domains: [{ uuid: uuidv4(), name: "", domains: [] }, ...state.domains]
    })
  }

  /**
   * Creates a function which can remove a domain object from state.
   */
  const handleRemoveDomain = index => () => {
    setState({
      ...state,
      domains: state.domains.filter((_, dIndex) => index !== dIndex)
    })
  }

  /**
   * Creates a copy of an object with new key/value pair from an event.
   */
  const handleObjectChange = (obj, event) => {
    const key = event.target.name
    return { ...obj, [key]: event.target.value}
  }

  /**
   * Creates a function which can update domain/rule arrays in state.
   * First layer takes a name ('domains', 'rules') and creates function
   * that takes an array index. This function then creates a function
   * which takes an event, updating the element at the index in the state.
   */
  const updateList = name => index => event => {
    const newData = state[name].map((obj, idx) => {
      if (idx !== index) return obj
      return handleObjectChange(obj, event)
    })
    setState({ ...state, [name]: newData })
  }
  const handleChangeDomain = updateList("domains")
  const handleChangeRule = updateList("rules")

  /**
   * Prepends a new rule to the rules array in state.
   *
   * Each new rule has the following properties:
   * @prop {String} uuid - Unique identifier string generated by uuidv4
   * @prop {String} name - Name of rule
   * @prop {Array} domains - Domain types used by this rule
   * @prop {Array} filters - Domain type filter rules
   * @prop {Array} renames - Domain type rename rules
   * @prop {String} evaluator - Evaluation logical expression
   * @prop {String} parent - UUID of parent rule, if any
   */
  const handleAddRule = () => {
    setState({
      ...state,
      rules: [
        {
          uuid: uuidv4(),
          name: "",
          domains: [],
          filters: [],
          renames: [],
          evaluator: "",
          parent: null,
        },
        ...state.rules
      ],
    })
  }

  /**
   * Generates removal function for a rule at a given index.
   * This function is passed to a <RuleList> argument, which will
   * call it for each <RuleItem> index, so rules can be deleted
   * from within those components by button click.
   */
  const handleRemoveRule = index => () => {
    let uuid = state.rules.filter((_, _idx) => _idx === index)[0].uuid
    setState({
      ...state,
      rules: state.rules.filter((rule, rIndex) => {
        if (rule.parent === uuid)
          rule.parent = ""
        return index !== rIndex
      }),
    })
  }

  /**
   * Serialises ruleset to JSON and prompts user download.
   */
  const handleSaveRule = () => {
    let text = JSON.stringify(state, null, 2)
    let blob = makeBlob(text)
    download(blob, 'synthaser_rules.json')
  }

  /**
   * Loads saved JSON ruleset from file <input> element.
   */
  const handleLoadRule = event => {
    let files = event.target.files
    let file = files[0]
    if (!file) return
    let reader = new FileReader()
    reader.readAsText(file)
    reader.onload = function() {
      let data = JSON.parse(reader.result)
      setState(data)
    }
    reader.onerror = function() {
      console.log(reader.error)
    }
  }

  return (
    <form>
      <div>
        <div className="navbar">
          <b>synthaser rule generator</b>
          <div className="nav-buttons">
            <button
              type="button"
              className="nav-button btn-save"
              onClick={handleSaveRule}
            >
              Save rules
            </button>
            <input
              type="file"
              name="file"
              id="rule-upload"
              onChange={handleLoadRule}
            />
            <label
              className="nav-button btn-load"
              htmlFor="rule-upload"
            >Load rules</label>
            <button
              type="button"
              className="nav-button btn-clear"
              onClick={() => setState({ domains: [], rules: [] })}
            >
              Clear all fields
            </button>
          </div>
        </div>
      </div>
      <div className="Container">
        <div className="Pane">
          <h2>Domain types</h2>
          <p>
            Define domain classes (e.g. KS) and select the relevant CDD domain families.
            Search suggestions are shown when at least 3 characters are typed in the box.
          </p>
          <DomainList
            domains={state.domains}
            handleAdd={handleAddDomain}
            handleRemove={handleRemoveDomain}
            handleChange={handleChangeDomain}
          />
        </div>
        <div className="Pane">
          <h2>Classification rules</h2>
          <p>
            Define classification rules (e.g. PKS) by selecting required domains (e.g. KS, AT)
            and their evaluation logic (e.g. 0 and 1).
          </p>
          <p>
            You can specify specific domain families to use for certain domain types in <b>domain filters</b> (e.g. only
            use the PKS_KS family from KS) as well as renaming rules in <b>rename domains</b>
             (e.g. rename all ACP after A or C domains to T). You can also select parent rules
            in the <b>parent rule</b> selector; the resulting hierarchy will be reflected in the
            <b> Rule hierarchy</b> pane on the right hand side.
          </p>
          <p>
            The <b>evaluation expression</b> of a rule is a logical expression which <em>synthaser</em> uses
            to determine if a sequence contains the correct combination of domains to satisfy the rule.
            For example, given <b>KS</b> and <b>AT</b> domains in the <b>Domain types</b> pane, I could
            create a rule <b>PKS</b> which requires both domains by first selecting <b>KS</b> and <b>AT</b> in
            the <b>Domains</b> field of the rule, then writing <b>0 and 1</b> as the evaluation expression.
            The numbers refer to the index of each domain in the domains list, so this expression essentially
            means 'KS and AT'.
          </p>
          <RuleList
            rules={state.rules}
            domains={state.domains}
            handleAdd={handleAddRule}
            handleRemove={handleRemoveRule}
            handleChange={handleChangeRule}
          />
        </div>
        <div className="Pane">
          <h2>Rule hierarchy</h2>
          <p>
            The hierarchy of classification rules, generated by the <b>parent rule</b> property
            of each rule you create.
            This determines the order in which rules will be evaluated inside
            synthaser. For example, if we have three rules PKS, NRPS and HR-PKS, and we set
            the parent rule of HR-PKS to PKS, synthaser will only evaluate HR-PKS if
            PKS was satisfied.
          </p>
          <RuleTree rules={nest(state.rules)} />
        </div>
      </div>
    </form>
  )
}
