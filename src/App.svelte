<script>
</script>

<main>
	<h1>Entry Application</h1>

    <form>
        <label class="inline" for="idName">Name: </label>
        <input type="text" id="idName" name="name" placeholder="write app name" size="21">
        <br>

        <label class="inline" for="idComment">Comment: </label>
        <input type="text" id="idComment" name="comment" placeholder="write a comment" size="18">
        <br>

        <label class="inline" for="idPath">Path: </label>
        <input type="text" id="idPath" name="path" placeholder="write the path to the executable" size="22">
        <br>

        <label class="inline" for="idIcon">Icon: </label>
        <input type="text" id="idIcon" name="icon" placeholder="write the path to the icon" size="22">

        <br>
        <button type="button" name="elaborate" id="idElaborate">Elaborate</button>
    </form>

</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		font-size: 4em;
		font-weight: 100;
    }

    /* #idElaborate */

    .inline {
        display: inline;
    }

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>